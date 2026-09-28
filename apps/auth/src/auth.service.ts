import { Inject, Injectable, Logger } from '@nestjs/common';
import {
   Argon2Util,
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_SECURITY,
   BadRequestException,
   ChangePasswordDto,
   DEFAULT_ROLES,
   IAuthResult,
   IDeviceInfo,
   IJwksResponse,
   IRevokeSessionResult,
   IRevokeTokenResult,
   IUserSessionInfo,
   IValidateTokenResult,
   LoginDto,
   NOTIFICATION_EVENTS,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   RegisterDto,
   USER_STATUS,
   UnauthorizedException,
} from '@common';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import { AuthConfigService } from '@auth/config';
import type { RoleEntity } from '@auth/entities/user.entity';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import type { IAuthRepository } from '@auth/repositories/auth.repository.interface';
import { AUTH_REPOSITORY } from '@auth/repositories/auth.repository.interface';
import { AuditLogService } from '@auth/services/audit-log.service';
import { TokenService } from '@auth/services/token.service';

export type AuthResult = IAuthResult;
export type ValidateTokenResult = IValidateTokenResult;

@Injectable()
export class AuthService {
   private readonly logger = new Logger(AuthService.name);

   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: IAuthRepository,
      private readonly rbacCacheService: RbacCacheService,
      private readonly tokenService: TokenService,
      private readonly outboxPublisherService: OutboxPublisherService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      private readonly config: AuthConfigService,
   ) {}

   getJwks(): IJwksResponse {
      return this.tokenService.getJwks();
   }

   private async getOrCacheRole(roleCode: string): Promise<RoleEntity | null> {
      const cached = await this.rbacCacheService.getRole(roleCode);
      if (cached) {
         return cached;
      }

      const role = await this.authRepository.findRoleByCode(roleCode);
      if (role) {
         await this.rbacCacheService.setRole(roleCode, {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
         });
      }

      return role;
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      const role = await this.getOrCacheRole(roleCode);
      return role?.permissions || [];
   }

   async register(dto: RegisterDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.authRepository.findByEmail(normalizedEmail);
      if (existing) {
         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_REGISTER,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, {
            params: { email: normalizedEmail },
         });
      }

      const [defaultRole, passwordHash] = await Promise.all([
         this.getOrCacheRole(DEFAULT_ROLES.USER),
         Argon2Util.hash(dto.password, this.config.argon2Secret),
      ]);

      const newUser = await this.authRepository.createUser(
         {
            email: normalizedEmail,
            fullName: dto.fullName.trim(),
            passwordHash,
            roleId: defaultRole?.id,
            status: USER_STATUS.ACTIVE,
            isEmailVerified: false,
         },
         {
            aggregateType: 'USER',
            eventType: NOTIFICATION_EVENTS.USER_REGISTERED,
            payload: {
               email: normalizedEmail,
               fullName: dto.fullName.trim(),
            },
         },
      );

      this.logger.log(`Created user ${newUser.email} with Outbox event; triggering publisher`);
      this.outboxPublisherService.triggerPublish();

      const userRoles = newUser.roles && newUser.roles.length > 0 ? newUser.roles : [DEFAULT_ROLES.USER];

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
         {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            roles: userRoles,
         },
         deviceInfo,
      );

      await this.auditLogService.record({
         userId: newUser.id,
         actorEmail: newUser.email,
         action: AUDIT_ACTIONS.AUTH_REGISTER,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { roles: userRoles },
      });

      return {
         user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            roles: userRoles,
            status: newUser.status || USER_STATUS.ACTIVE,
            isEmailVerified: newUser.isEmailVerified ?? false,
            lastLoginAt: newUser.lastLoginAt ?? null,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
         },
         accessToken,
         refreshToken,
      };
   }

   private async handleFailedLoginAttempt(
      lockoutKey: string,
      failedAttemptsKey: string,
      email: string,
      ip: string,
      deviceInfo?: IDeviceInfo,
      userId?: string,
   ): Promise<void> {
      const attempts = await this.redisService.incr(failedAttemptsKey);
      if (attempts === 1) {
         await this.redisService.expire(failedAttemptsKey, REDIS_TTL.AUTH_FAILED_ATTEMPTS);
      }

      if (attempts >= AUTH_SECURITY.MAX_FAILED_LOGIN_ATTEMPTS) {
         await Promise.all([
            this.redisService.set(lockoutKey, 'locked', REDIS_TTL.AUTH_LOCKOUT),
            this.redisService.del(failedAttemptsKey),
         ]);
         this.logger.warn(
            `Account ${email} temporarily locked for IP ${ip} after ${attempts} consecutive failed attempts.`,
         );

         await this.auditLogService.record({
            userId: userId || null,
            actorEmail: email,
            action: AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: ip,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
            metadata: { consecutiveFailedAttempts: attempts, lockoutSeconds: REDIS_TTL.AUTH_LOCKOUT },
         });

         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
            params: {
               email,
               ip,
               remainingSeconds: REDIS_TTL.AUTH_LOCKOUT,
               remainingMinutes: Math.ceil(REDIS_TTL.AUTH_LOCKOUT / 60),
            },
         });
      }
   }

   async login(dto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const clientIp = deviceInfo?.ipAddress || dto.ip?.trim() || 'unknown';
      const lockoutKey = `${REDIS_KEY_PREFIX.LOCKOUT}${normalizedEmail}:${clientIp}`;
      const failedAttemptsKey = `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}${normalizedEmail}:${clientIp}`;

      // Check if identity + IP combination is currently locked out
      const isLocked = await this.redisService.get(lockoutKey);
      if (isLocked) {
         const remainingSeconds = await this.redisService.ttl(lockoutKey);
         const remainingMinutes = Math.max(
            Math.ceil((remainingSeconds > 0 ? remainingSeconds : REDIS_TTL.AUTH_LOCKOUT) / 60),
            1,
         );

         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: clientIp,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
            metadata: { remainingSeconds },
         });

         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
            params: {
               email: normalizedEmail,
               ip: clientIp,
               remainingSeconds: remainingSeconds > 0 ? remainingSeconds : REDIS_TTL.AUTH_LOCKOUT,
               remainingMinutes,
            },
         });
      }

      const user = await this.authRepository.findByEmail(normalizedEmail);
      if (!user) {
         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: clientIp,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
         });
         await this.handleFailedLoginAttempt(lockoutKey, failedAttemptsKey, normalizedEmail, clientIp, deviceInfo);
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      const isValid = await Argon2Util.verify(user.passwordHash, dto.password, this.config.argon2Secret);
      if (!isValid) {
         await this.auditLogService.record({
            userId: user.id,
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: clientIp,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
         });
         await this.handleFailedLoginAttempt(
            lockoutKey,
            failedAttemptsKey,
            normalizedEmail,
            clientIp,
            deviceInfo,
            user.id,
         );
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         await this.auditLogService.record({
            userId: user.id,
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: clientIp,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.ACCOUNT_BLOCKED,
         });
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         await this.auditLogService.record({
            userId: user.id,
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: clientIp,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
         });
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      // Successful authentication -> Reset failed attempts counter and clear lockout if any
      await Promise.all([this.redisService.del(failedAttemptsKey), this.redisService.del(lockoutKey)]);

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : [DEFAULT_ROLES.USER];

      // Ensure permissions for user's roles are cached in Redis
      await Promise.all(userRoles.map((role) => this.getOrCacheRole(role)));

      const nowIso = new Date().toISOString();
      await this.authRepository.updateUser(user.id, { lastLoginAt: nowIso });

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
         {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
         },
         deviceInfo,
      );

      await this.auditLogService.record({
         userId: user.id,
         actorEmail: user.email,
         action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: clientIp,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { roles: userRoles },
      });

      return {
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: nowIso,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
         accessToken,
         refreshToken,
      };
   }

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const payload = await this.tokenService.validateRefreshToken(token);

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         await this.tokenService.logoutAll(user.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         await this.tokenService.logoutAll(user.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : payload.roles || [DEFAULT_ROLES.USER];

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : undefined;

      // Rotate token pair and update session in database & Redis
      const { accessToken, refreshToken: newRefreshToken } = await this.tokenService.rotateTokenPair(
         {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
         },
         payload.jti as string,
         deviceInfo,
         remainingTtl,
      );

      await this.auditLogService.record({
         userId: user.id,
         actorEmail: user.email,
         action: AUDIT_ACTIONS.AUTH_TOKEN_REFRESH,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
      });

      return {
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
         accessToken,
         refreshToken: newRefreshToken,
      };
   }

   async getSessions(userId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      return this.tokenService.getActiveSessions(userId, currentJti);
   }

   async revokeSession(userId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<IRevokeSessionResult> {
      const result = await this.tokenService.revokeSession(userId, sessionId);
      await this.auditLogService.record({
         userId,
         action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { sessionId },
      });
      return result;
   }

   async revokeOtherSessions(
      userId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      const result = await this.tokenService.revokeOtherSessions(userId, currentJti);
      await this.auditLogService.record({
         userId,
         action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE_OTHERS,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { revokedCount: result.revokedCount },
      });
      return result;
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<IRevokeTokenResult> {
      const result = await this.tokenService.revokeToken(token);
      await this.auditLogService.record({
         action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
      });
      return result;
   }

   async revokeAllUserTokens(userId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.revokeAllUserTokens(userId);
      await this.auditLogService.record({
         userId,
         action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
      });
   }

   async logoutAll(userId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.logoutAll(userId);
      await this.auditLogService.record({
         userId,
         action: AUDIT_ACTIONS.AUTH_LOGOUT_ALL,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
      });
   }

   async changePassword(
      userId: string,
      dto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<{ success: boolean; message: string }> {
      const user = await this.authRepository.findById(userId);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const isOldValid = await Argon2Util.verify(user.passwordHash, dto.currentPassword, this.config.argon2Secret);
      if (!isOldValid) {
         await this.auditLogService.record({
            userId,
            actorEmail: user.email,
            action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.INVALID_OLD_PASSWORD,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_OLD_PASSWORD);
      }

      if (dto.currentPassword === dto.newPassword) {
         await this.auditLogService.record({
            userId,
            actorEmail: user.email,
            action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.PASSWORD_UNCHANGED,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.PASSWORD_UNCHANGED);
      }

      const newPasswordHash = await Argon2Util.hash(dto.newPassword, this.config.argon2Secret);
      await this.authRepository.updateUser(userId, { passwordHash: newPasswordHash });

      // Invalidate all active user sessions and access/refresh tokens across devices
      await this.tokenService.logoutAll(userId);

      await this.auditLogService.record({
         userId,
         actorEmail: user.email,
         action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata: { message: 'Password changed and all active sessions terminated' },
      });

      return {
         success: true,
         message: 'Password changed successfully. All sessions have been logged out.',
      };
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      const payload = await this.tokenService.validateAccessToken(token);

      const user = await this.authRepository.findById(payload.sub);
      if (!user) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.SUSPENDED) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (user.status === USER_STATUS.INACTIVE) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const userRoles = user.roles && user.roles.length > 0 ? user.roles : payload.roles || [DEFAULT_ROLES.USER];

      return {
         valid: true,
         user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: userRoles,
            status: user.status || USER_STATUS.ACTIVE,
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: user.lastLoginAt ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         },
      };
   }
}
