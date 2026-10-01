import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   Argon2Util,
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AUTH_SECURITY,
   BadRequestException,
   ChangePasswordDto,
   DEFAULT_ROLES,
   IAuthResult,
   IDeviceInfo,
   IJwksResponse,
   IRevokeSessionResult,
   IUserSessionInfo,
   IValidateTokenResult,
   LoginDto,
   NOTIFICATION_EVENTS,
   NOTIFICATION_PATTERNS,
   OtpUtil,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   ChangePasswordResponseDto,
   RedisService,
   RegisterDto,
   SERVICES,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   USER_STATUS,
   UnauthorizedException,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
   uuidv7,
} from '@common';
import { AuthConfigService } from '@auth/config';
import type { RoleEntity } from '@auth/entities/account.entity';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import type { IAuthRepository } from '@auth/repositories/auth.repository.interface';
import { AUTH_REPOSITORY } from '@auth/repositories/auth.repository.interface';
import { AuditLogService } from '@auth/services/audit-log.service';
import { EmailBloomFilterService } from '@auth/services/email-bloom-filter.service';
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
      private readonly emailBloomFilterService: EmailBloomFilterService,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
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

   async checkEmail(email: string): Promise<{ available: boolean; email: string }> {
      const normalizedEmail = email.trim().toLowerCase();
      const available = await this.emailBloomFilterService.isEmailAvailable(normalizedEmail);
      return { available, email: normalizedEmail };
   }

   async sendRegisterOtp(dto: SendRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<SendRegisterOtpResponseDto> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const isAvailable = await this.emailBloomFilterService.isEmailAvailable(normalizedEmail);
      if (!isAvailable) {
         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
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

      const cooldownKey = `${REDIS_KEY_PREFIX.OTP_REGISTER_COOLDOWN}${normalizedEmail}`;
      const remainingCooldown = await this.redisService.ttl(cooldownKey);
      if (remainingCooldown > 0) {
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE, {
            params: { remainingSeconds: remainingCooldown },
         });
      }

      // Generate 6-digit secure OTP
      const otp = OtpUtil.generate();
      const otpKey = `${REDIS_KEY_PREFIX.OTP_REGISTER}${normalizedEmail}`;
      const attemptsKey = `${REDIS_KEY_PREFIX.OTP_REGISTER_ATTEMPTS}${normalizedEmail}`;

      await Promise.all([
         this.redisService.set(otpKey, otp, REDIS_TTL.OTP_REGISTER),
         this.redisService.set(cooldownKey, '1', REDIS_TTL.OTP_REGISTER_COOLDOWN),
         this.redisService.del(attemptsKey),
      ]);

      this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_OTP_EMAIL, {
         to: normalizedEmail,
         otpCode: otp,
         expiresInMinutes: Math.round(REDIS_TTL.OTP_REGISTER / 60),
      });

      await this.auditLogService.record({
         actorEmail: normalizedEmail,
         action: AUDIT_ACTIONS.AUTH_OTP_SENT,
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
         success: true,
         message: AUTH_RESPONSE_MESSAGES.SEND_OTP_SUCCESS,
         cooldownSeconds: REDIS_TTL.OTP_REGISTER_COOLDOWN,
         expiresInMinutes: Math.round(REDIS_TTL.OTP_REGISTER / 60),
      };
   }

   async verifyRegisterOtp(dto: VerifyRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<VerifyRegisterOtpResponseDto> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const otpKey = `${REDIS_KEY_PREFIX.OTP_REGISTER}${normalizedEmail}`;
      const attemptsKey = `${REDIS_KEY_PREFIX.OTP_REGISTER_ATTEMPTS}${normalizedEmail}`;

      const storedOtp = await this.redisService.get(otpKey);
      if (!storedOtp) {
         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            reason: AUTH_ERROR_CODES.OTP_EXPIRED,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_EXPIRED);
      }

      if (storedOtp !== dto.otp) {
         const attempts = await this.redisService.incr(attemptsKey);
         if (attempts === 1) {
            await this.redisService.expire(attemptsKey, REDIS_TTL.OTP_REGISTER);
         }

         if (attempts >= AUTH_SECURITY.MAX_OTP_ATTEMPTS) {
            await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);
            await this.auditLogService.record({
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: deviceInfo?.ipAddress,
               reason: AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
            });
            throw new BadRequestException(AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED);
         }

         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            reason: AUTH_ERROR_CODES.OTP_INVALID,
            metadata: { remainingAttempts: AUTH_SECURITY.MAX_OTP_ATTEMPTS - attempts },
         });

         throw new BadRequestException(AUTH_ERROR_CODES.OTP_INVALID, {
            params: { remainingAttempts: AUTH_SECURITY.MAX_OTP_ATTEMPTS - attempts },
         });
      }

      // OTP is valid -> generate single-use verificationToken
      const verificationToken = `vtok_${uuidv7().replace(/-/g, '')}`;
      const tokenKey = `${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${verificationToken}`;

      await Promise.all([
         this.redisService.set(tokenKey, normalizedEmail, REDIS_TTL.OTP_VERIFICATION_TOKEN),
         this.redisService.del(otpKey),
         this.redisService.del(attemptsKey),
      ]);

      await this.auditLogService.record({
         actorEmail: normalizedEmail,
         action: AUDIT_ACTIONS.AUTH_OTP_VERIFIED,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
      });

      return {
         success: true,
         verificationToken,
         expiresInSeconds: REDIS_TTL.OTP_VERIFICATION_TOKEN,
      };
   }

   async register(dto: RegisterDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const normalizedEmail = dto.email.trim().toLowerCase();

      let isEmailVerified = false;
      if (dto.verificationToken) {
         const tokenKey = `${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${dto.verificationToken}`;
         const verifiedEmail = await this.redisService.get(tokenKey);
         if (!verifiedEmail || verifiedEmail !== normalizedEmail) {
            throw new BadRequestException(AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID);
         }
         isEmailVerified = true;
         await this.redisService.del(tokenKey);
      }

      const mightContain = await this.emailBloomFilterService.mightContain(normalizedEmail);
      if (mightContain) {
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
      }

      const [defaultRole, passwordHash] = await Promise.all([
         this.getOrCacheRole(DEFAULT_ROLES.USER),
         Argon2Util.hash(dto.password, this.config.argon2Secret),
      ]);

      const newAccount = await this.authRepository.createAccount(
         {
            email: normalizedEmail,
            passwordHash,
            roleId: defaultRole?.id,
            status: USER_STATUS.ACTIVE,
            isEmailVerified,
         },
         {
            aggregateType: 'ACCOUNT',
            eventType: NOTIFICATION_EVENTS.USER_REGISTERED,
            payload: {
               email: normalizedEmail,
            },
         },
      );

      await this.emailBloomFilterService.addEmail(normalizedEmail);
      this.logger.log(`Created account ${newAccount.email} with Outbox event; triggering publisher`);
      this.outboxPublisherService.triggerPublish();

      const accountRoles = newAccount.roles && newAccount.roles.length > 0 ? newAccount.roles : [DEFAULT_ROLES.USER];

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(
         {
            id: newAccount.id,
            email: newAccount.email,
            roles: accountRoles,
         },
         deviceInfo,
      );

      await this.auditLogService.record({
         accountId: newAccount.id,
         actorEmail: newAccount.email,
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
         metadata: { roles: accountRoles },
      });

      return {
         user: {
            id: newAccount.id,
            email: newAccount.email,
            roles: accountRoles,
            status: newAccount.status || USER_STATUS.ACTIVE,
            isEmailVerified: newAccount.isEmailVerified ?? false,
            lastLoginAt: newAccount.lastLoginAt ?? null,
            createdAt: newAccount.createdAt,
            updatedAt: newAccount.updatedAt,
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

      // Successful authentication -> Reset failed attempts counter and clear lockout if any
      await Promise.all([this.redisService.del(failedAttemptsKey), this.redisService.del(lockoutKey)]);

      const accountRoles = account.roles && account.roles.length > 0 ? account.roles : [DEFAULT_ROLES.USER];

      // Ensure permissions for roles are cached in Redis
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
            lastLoginAt: nowIso,
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

      // Rotate token pair and update session in database & Redis
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

   async getSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      return this.tokenService.getActiveSessions(accountId, currentJti);
   }

   async revokeSession(accountId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenService.revokeSession(accountId, sessionId);
      await this.auditLogService.record({
         accountId,
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
   }

   async revokeOtherSessions(
      accountId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      const result = await this.tokenService.revokeOtherSessions(accountId, currentJti);
      await this.auditLogService.record({
         accountId,
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

   async changePassword(
      accountId: string,
      dto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<ChangePasswordResponseDto> {
      const account = await this.authRepository.findById(accountId);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const isOldValid = await Argon2Util.verify(account.passwordHash, dto.currentPassword, this.config.argon2Secret);
      if (!isOldValid) {
         await this.auditLogService.record({
            accountId,
            actorEmail: account.email,
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
            accountId,
            actorEmail: account.email,
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

      const normalizedEmail = account.email.trim().toLowerCase();
      const cooldownKey = `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_COOLDOWN}${normalizedEmail}`;
      const isCooldown = await this.redisService.get(cooldownKey);
      if (isCooldown) {
         const ttl = await this.redisService.ttl(cooldownKey);
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE, {
            params: { cooldownSeconds: ttl > 0 ? ttl : REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN },
         });
      }

      // Hash new password once and store in Redis along with OTP
      const newPasswordHash = await Argon2Util.hash(dto.newPassword, this.config.argon2Secret);
      const otp = OtpUtil.generate();
      const otpKey = `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}${normalizedEmail}`;
      const attemptsKey = `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_ATTEMPTS}${normalizedEmail}`;

      await Promise.all([
         this.redisService.setJson(
            otpKey,
            {
               otp,
               newPasswordHash,
               logoutAll: Boolean(dto.logoutAll),
            },
            REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES,
         ),
         this.redisService.set(cooldownKey, '1', REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN),
         this.redisService.del(attemptsKey),
      ]);

      this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_CHANGE_PASSWORD_OTP_EMAIL, {
         to: normalizedEmail,
         otpCode: otp,
         expiresInMinutes: Math.round(REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES / 60),
      });

      await this.auditLogService.record({
         accountId,
         actorEmail: normalizedEmail,
         action: AUDIT_ACTIONS.AUTH_OTP_SENT,
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
         success: true,
         message: AUTH_RESPONSE_MESSAGES.SEND_CHANGE_PASSWORD_OTP_SUCCESS,
         cooldownSeconds: REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN,
         expiresInMinutes: Math.round(REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES / 60),
      };
   }

   async verifyChangePasswordOtp(
      accountId: string,
      dto: VerifyChangePasswordOtpDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      const account = await this.authRepository.findById(accountId);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const normalizedEmail = account.email.trim().toLowerCase();
      const otpKey = `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}${normalizedEmail}`;
      const attemptsKey = `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_ATTEMPTS}${normalizedEmail}`;

      const pendingData = await this.redisService.getJson<{
         otp: string;
         newPasswordHash: string;
         logoutAll: boolean;
      }>(otpKey);

      if (!pendingData) {
         await this.auditLogService.record({
            accountId,
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            reason: AUTH_ERROR_CODES.OTP_EXPIRED,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_EXPIRED);
      }

      if (pendingData.otp !== dto.otp) {
         const attempts = await this.redisService.incr(attemptsKey);
         if (attempts === 1) {
            await this.redisService.expire(attemptsKey, REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES);
         }

         if (attempts >= AUTH_SECURITY.MAX_OTP_ATTEMPTS) {
            await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);
            await this.auditLogService.record({
               accountId,
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: deviceInfo?.ipAddress,
               reason: AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
            });
            throw new BadRequestException(AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED);
         }

         await this.auditLogService.record({
            accountId,
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: deviceInfo?.ipAddress,
            reason: AUTH_ERROR_CODES.OTP_INVALID,
         });
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_INVALID, {
            params: { remainingAttempts: AUTH_SECURITY.MAX_OTP_ATTEMPTS - attempts },
         });
      }

      // Direct DB update using precomputed hash
      await this.authRepository.updateAccount(accountId, { passwordHash: pendingData.newPasswordHash });

      // Clean up Redis keys
      await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);

      // If logoutAll is true, revoke other sessions
      if (pendingData.logoutAll) {
         await this.tokenService.logoutAll(accountId);
      }

      await this.auditLogService.record({
         accountId,
         actorEmail: normalizedEmail,
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
         metadata: { logoutAll: pendingData.logoutAll },
      });

      return {
         success: true,
         message: AUTH_RESPONSE_MESSAGES.CHANGE_PASSWORD_SUCCESS,
         logoutAll: pendingData.logoutAll,
      };
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
}
