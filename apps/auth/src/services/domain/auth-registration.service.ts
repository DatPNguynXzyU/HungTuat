import type { ITokenService } from '@auth/services/infrastructure';
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
   DEFAULT_ROLES,
   NOTIFICATION_EVENTS,
   NOTIFICATION_PATTERNS,
   OtpUtil,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   SERVICES,
   USER_STATUS,
} from '@common';
import type {
   IDeviceInfo,
   IAuthResult,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
   RegisterDto,
} from '@common';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { OutboxPublisherService } from '@auth/outbox';
import { AuditLogService, EmailBloomFilterService, TOKEN_SERVICE } from '@auth/services/infrastructure';
import type { RoleEntity } from '@auth/entities';

@Injectable()
export class AuthRegistrationService {
   private readonly logger = new Logger(AuthRegistrationService.name);

   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: AuthRepository,
      private readonly rbacCacheService: RbacCacheService,
      @Inject(TOKEN_SERVICE)
      private readonly tokenService: ITokenService,
      private readonly emailBloomFilterService: EmailBloomFilterService,
      private readonly outboxPublisherService: OutboxPublisherService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly config: AuthConfigService,
   ) {}

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

      const verificationToken = await this.tokenService.generateVerificationToken(
         normalizedEmail,
         REDIS_TTL.OTP_VERIFICATION_TOKEN,
      );

      await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);

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
         const verifiedEmail = await this.tokenService.consumeVerificationToken(dto.verificationToken);
         if (!verifiedEmail || verifiedEmail !== normalizedEmail) {
            throw new BadRequestException(AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID);
         }
         isEmailVerified = true;
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
}
