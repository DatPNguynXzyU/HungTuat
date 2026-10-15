import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, OtpUtil, RedisService, UnauthorizedException } from '@common';
import type { IDeviceInfo } from '@common';
import {
   AUDIT_ACTIONS,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AUTH_SECURITY,
   ChangePasswordDto,
   type ChangePasswordResponseDto,
   VerifyChangePasswordOtpDto,
   type VerifyChangePasswordOtpResponseDto,
} from '@contracts/auth';
import { NOTIFICATION_ADAPTER, type INotificationAdapter } from '@auth/adapters';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';
import { AuditLogBuilder } from '@auth/builders/audit-log.builder';
import { AuthConfigService } from '@auth/config';
import { AUTH_METRICS_OTP_OPERATIONS, AUTH_METRICS_OTP_TYPES, AUTH_REDIS_TTL, AuthRedisKeys } from '@auth/constants';
import {
   AUTH_RATE_LIMITER,
   type IAuthRateLimiter,
   AuditLogService,
   PASSWORD_HASHER,
   type IPasswordHasher,
   TOKEN_LIFECYCLE_SERVICE,
   type ITokenLifecycleService,
} from '@auth/services/infrastructure';
import { PasswordChangeSaga } from '@auth/sagas';
import { Password } from '@auth/domain/value-objects';
import {
   AUTH_DOMAIN_EVENTS,
   OtpFailedEvent,
   OtpGeneratedEvent,
   OtpVerifiedEvent,
   PasswordChangedEvent,
} from '@auth/domain/events';
import { PasswordMustChangeSpecification } from '@auth/domain/specifications';

@Injectable()
export class PasswordManagementService {
   private readonly logger = new Logger(PasswordManagementService.name);
   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      @Inject(PASSWORD_HASHER)
      private readonly passwordHasher: IPasswordHasher,
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      @Inject(NOTIFICATION_ADAPTER)
      private readonly notificationAdapter: INotificationAdapter,
      private readonly config: AuthConfigService,
      private readonly eventEmitter: EventEmitter2,
      @Optional()
      private readonly passwordMustChangeSpec: PasswordMustChangeSpecification = new PasswordMustChangeSpecification(),
   ) {}

   async changePassword(
      accountId: string,
      dto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<ChangePasswordResponseDto> {
      const startTime = Date.now();
      await this.rateLimiter.checkChangePassword(accountId);

      const account = await this.accountRepository.findById(accountId);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const isOldValid = await this.passwordHasher.verify(account.passwordHash, dto.currentPassword);
      if (!isOldValid) {
         await this.auditLogService.record(
            AuditLogBuilder.create()
               .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
               .asFailure(AUTH_ERROR_CODES.INVALID_OLD_PASSWORD)
               .withAccount(account)
               .withDeviceInfo(deviceInfo)
               .build(),
         );
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_OLD_PASSWORD);
      }

      const passwordMustChangeValidation = this.passwordMustChangeSpec.validate({
         currentPassword: dto.currentPassword,
         newPassword: dto.newPassword,
      });
      if (passwordMustChangeValidation.isFailure()) {
         const errorCode = passwordMustChangeValidation.getError();
         await this.auditLogService.record(
            AuditLogBuilder.create()
               .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
               .asFailure(errorCode)
               .withAccount(account)
               .withDeviceInfo(deviceInfo)
               .build(),
         );
         throw new BadRequestException(errorCode);
      }

      const passwordResult = Password.create(dto.newPassword);
      if (passwordResult.isFailure()) {
         throw new BadRequestException(AUTH_ERROR_CODES.WEAK_PASSWORD, {
            params: passwordResult.getParams(),
         });
      }
      const newPassword = passwordResult.getValue();

      const normalizedEmail = account.email.trim().toLowerCase();
      const cooldownKey = AuthRedisKeys.changePasswordOtpCooldown(normalizedEmail);
      const isCooldown = await this.redisService.get(cooldownKey);
      if (isCooldown) {
         const ttl = await this.redisService.ttl(cooldownKey);
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE, {
            params: { cooldownSeconds: ttl > 0 ? ttl : AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN },
         });
      }

      const newPasswordHash = await newPassword.hash(this.passwordHasher);

      const otp = OtpUtil.generate();
      const otpKey = AuthRedisKeys.changePasswordOtp(normalizedEmail);
      const attemptsKey = AuthRedisKeys.changePasswordOtpAttempts(normalizedEmail);

      await Promise.all([
         this.redisService.setJson(
            otpKey,
            {
               otp,
               newPasswordHash,
               logoutAll: Boolean(dto.logoutAll),
            },
            AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES,
         ),
         this.redisService.set(cooldownKey, '1', AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN),
         this.redisService.del(attemptsKey),
      ]);

      await this.notificationAdapter.sendChangePasswordOtp(
         normalizedEmail,
         otp,
         Math.round(AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES / 60),
      );

      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_OTP_SENT)
            .asSuccess()
            .withActor(normalizedEmail, accountId)
            .withDeviceInfo(deviceInfo)
            .build(),
      );

      this.eventEmitter.emit(
         AUTH_DOMAIN_EVENTS.OTP_GENERATED,
         new OtpGeneratedEvent(
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            (Date.now() - startTime) / 1000,
            normalizedEmail,
         ),
      );

      return {
         success: true,
         message: AUTH_RESPONSE_MESSAGES.SEND_CHANGE_PASSWORD_OTP_SUCCESS,
         cooldownSeconds: AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN,
         expiresInMinutes: Math.round(AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES / 60),
      };
   }

   async verifyChangePasswordOtp(
      accountId: string,
      dto: VerifyChangePasswordOtpDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      const startTime = Date.now();
      await this.rateLimiter.checkVerifyChangePasswordOtp(accountId);

      const account = await this.accountRepository.findById(accountId);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const normalizedEmail = account.email.trim().toLowerCase();
      const otpKey = AuthRedisKeys.changePasswordOtp(normalizedEmail);
      const attemptsKey = AuthRedisKeys.changePasswordOtpAttempts(normalizedEmail);

      const pendingData = await this.redisService.getJson<{
         otp: string;
         newPasswordHash: string;
         logoutAll: boolean;
      }>(otpKey);

      if (!pendingData) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.OTP_FAILED,
            new OtpFailedEvent(
               AUTH_METRICS_OTP_OPERATIONS.VERIFY,
               AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
               normalizedEmail,
               AUTH_ERROR_CODES.OTP_EXPIRED,
            ),
         );
         await this.auditLogService.record(
            AuditLogBuilder.create()
               .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
               .asFailure(AUTH_ERROR_CODES.OTP_EXPIRED)
               .withActor(normalizedEmail, accountId)
               .withIpAddress(deviceInfo?.ipAddress)
               .build(),
         );
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_EXPIRED);
      }

      if (pendingData.otp !== dto.otp) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.OTP_FAILED,
            new OtpFailedEvent(
               AUTH_METRICS_OTP_OPERATIONS.VERIFY,
               AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
               normalizedEmail,
               AUTH_ERROR_CODES.OTP_INVALID,
            ),
         );
         const attempts = await this.redisService.incr(attemptsKey);
         if (attempts === 1) {
            await this.redisService.expire(attemptsKey, AUTH_REDIS_TTL.OTP_CHANGE_PASSWORD_EXPIRES);
         }

         if (attempts >= AUTH_SECURITY.MAX_OTP_ATTEMPTS) {
            await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);
            await this.auditLogService.record(
               AuditLogBuilder.create()
                  .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
                  .asFailure(AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED)
                  .withActor(normalizedEmail, accountId)
                  .withIpAddress(deviceInfo?.ipAddress)
                  .build(),
            );
            throw new BadRequestException(AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED);
         }

         await this.auditLogService.record(
            AuditLogBuilder.create()
               .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
               .asFailure(AUTH_ERROR_CODES.OTP_INVALID)
               .withActor(normalizedEmail, accountId)
               .withIpAddress(deviceInfo?.ipAddress)
               .build(),
         );
         throw new BadRequestException(AUTH_ERROR_CODES.OTP_INVALID, {
            params: { remainingAttempts: AUTH_SECURITY.MAX_OTP_ATTEMPTS - attempts },
         });
      }

      const saga = new PasswordChangeSaga(this.accountRepository);
      saga.setAccount(accountId, account.passwordHash);

      try {
         // Update password in database with compensation capability
         await this.accountRepository.update(accountId, { passwordHash: pendingData.newPasswordHash });
         saga.markPasswordUpdated();

         // Revoke tokens if requested (critical security boundary)
         if (pendingData.logoutAll) {
            await this.tokenLifecycleService.logoutAll(accountId);
         }

         // Clear OTP in Redis (best effort)
         await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]).catch(
            (redisErr: unknown) => {
               this.logger.warn(`Failed to clear OTP keys in Redis for ${normalizedEmail}`, redisErr);
            },
         );

         // Record audit log (fire-and-forget, non-blocking)
         this.auditLogService
            .record(
               AuditLogBuilder.create()
                  .withAction(AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE)
                  .asSuccess()
                  .withActor(normalizedEmail, accountId)
                  .withDeviceInfo(deviceInfo)
                  .withMetadata({ logoutAll: pendingData.logoutAll })
                  .build(),
            )
            .catch((err: unknown) => {
               this.logger.error('Failed to record password change audit log (non-blocking)', err);
            });

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.OTP_VERIFIED,
            new OtpVerifiedEvent(
               AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
               (Date.now() - startTime) / 1000,
               normalizedEmail,
            ),
         );

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.PASSWORD_CHANGED,
            new PasswordChangedEvent(accountId, account.email, new Date(), deviceInfo?.ipAddress, deviceInfo),
         );

         return {
            success: true,
            message: AUTH_RESPONSE_MESSAGES.CHANGE_PASSWORD_SUCCESS,
         };
      } catch (error: unknown) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.OTP_FAILED,
            new OtpFailedEvent(
               AUTH_METRICS_OTP_OPERATIONS.VERIFY,
               AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
               normalizedEmail,
               error instanceof Error ? error.message : undefined,
            ),
         );
         // Trigger compensating transaction to revert password in DB if it succeeded before token revocation failed
         await saga.rollback();
         throw error;
      }
   }
}
