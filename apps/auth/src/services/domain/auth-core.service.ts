import type { ITokenService } from '@auth/services/infrastructure';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
   Argon2Util,
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   AUTH_SECURITY,
   DEFAULT_ROLES,
   NotFoundException,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   UnauthorizedException,
   USER_STATUS,
} from '@common';
import type {
   IDeviceInfo,
   IAuthResult,
   IValidateTokenResult,
   IJwksResponse,
   LoginDto,
   UserEmailResponseDto,
} from '@common';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';
import type { RoleEntity } from '@auth/entities';

@Injectable()
export class AuthCoreService {
   private readonly logger = new Logger(AuthCoreService.name);

   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: AuthRepository,
      private readonly rbacCacheService: RbacCacheService,
      @Inject(TOKEN_SERVICE)
      private readonly tokenService: ITokenService,
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

   private async handleFailedLoginAttempt(
      lockoutKey: string,
      failedAttemptsKey: string,
      email: string,
      ip: string,
      deviceInfo?: IDeviceInfo,
      accountId?: string,
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
            accountId: accountId || null,
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

      const account = await this.authRepository.findByEmail(normalizedEmail);
      if (!account) {
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

      const isValid = await Argon2Util.verify(account.passwordHash, dto.password, this.config.argon2Secret);
      if (!isValid) {
         await this.auditLogService.record({
            accountId: account.id,
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
            account.id,
         );
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
         await this.auditLogService.record({
            accountId: account.id,
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

      if (account.status === USER_STATUS.INACTIVE) {
         await this.auditLogService.record({
            accountId: account.id,
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

      await Promise.all([this.redisService.del(failedAttemptsKey), this.redisService.del(lockoutKey)]);

      const accountRoles = account.roles && account.roles.length > 0 ? account.roles : [DEFAULT_ROLES.USER];
      await Promise.all(accountRoles.map((role) => this.getOrCacheRole(role)));

      const nowIso = new Date().toISOString();
      await this.authRepository.updateAccount(account.id, { lastLoginAt: nowIso });

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
         {
            id: account.id,
            email: account.email,
            roles: accountRoles,
         },
         deviceInfo,
      );

      await this.auditLogService.record({
         accountId: account.id,
         actorEmail: account.email,
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
         metadata: { roles: accountRoles },
      });

      return {
         user: {
            id: account.id,
            email: account.email,
            roles: accountRoles,
            status: account.status || USER_STATUS.ACTIVE,
            isEmailVerified: account.isEmailVerified ?? false,
            lastLoginAt: account.lastLoginAt ?? null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
         },
         accessToken,
         refreshToken,
      };
   }

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const payload = await this.tokenService.validateRefreshToken(token);

      const account = await this.authRepository.findById(payload.sub);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
         await this.tokenService.logoutAll(account.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (account.status === USER_STATUS.INACTIVE) {
         await this.tokenService.logoutAll(account.id);
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const accountRoles =
         account.roles && account.roles.length > 0 ? account.roles : payload.roles || [DEFAULT_ROLES.USER];

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : undefined;

      const { accessToken, refreshToken: newRefreshToken } = await this.tokenService.rotateTokenPair(
         {
            id: account.id,
            email: account.email,
            roles: accountRoles,
         },
         payload.jti as string,
         deviceInfo,
         remainingTtl,
      );

      await this.auditLogService.record({
         accountId: account.id,
         actorEmail: account.email,
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
            id: account.id,
            email: account.email,
            roles: accountRoles,
            status: account.status || USER_STATUS.ACTIVE,
            isEmailVerified: account.isEmailVerified ?? false,
            lastLoginAt: account.lastLoginAt ?? null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
         },
         accessToken,
         refreshToken: newRefreshToken,
      };
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.revokeToken(token);
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
   }

   async revokeAllAccountTokens(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.revokeAllAccountTokens(accountId);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
      });
   }

   async logoutAll(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.logoutAll(accountId);
      await this.auditLogService.record({
         accountId,
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

   async validateToken(token: string): Promise<IValidateTokenResult> {
      const payload = await this.tokenService.validateAccessToken(token);

      const account = await this.authRepository.findById(payload.sub);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (account.status === USER_STATUS.INACTIVE) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const accountRoles =
         account.roles && account.roles.length > 0 ? account.roles : payload.roles || [DEFAULT_ROLES.USER];

      return {
         valid: true,
         user: {
            id: account.id,
            email: account.email,
            roles: accountRoles,
            status: account.status || USER_STATUS.ACTIVE,
            isEmailVerified: account.isEmailVerified ?? false,
            lastLoginAt: account.lastLoginAt ?? null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
         },
      };
   }

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      const account = await this.authRepository.findEmailById(accountId);
      if (!account) {
         throw new NotFoundException(AUTH_ERROR_CODES.USER_NOT_FOUND, {
            params: { id: accountId },
         });
      }

      return {
         id: account.id,
         email: account.email,
         isEmailVerified: account.isEmailVerified,
      };
   }
}
