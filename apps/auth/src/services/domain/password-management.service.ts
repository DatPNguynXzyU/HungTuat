import type { ITokenLifecycleService } from '@auth/services/infrastructure';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy } from '@nestjs/microservices';
import { BadRequestException, OtpUtil, REDIS_TTL, RedisService, SERVICES, UnauthorizedException } from '@common';
import type { IDeviceInfo } from '@common';
import {
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AUTH_SECURITY,
   ChangePasswordDto,
   type ChangePasswordResponseDto,
   VerifyChangePasswordOtpDto,
   type VerifyChangePasswordOtpResponseDto,
} from '@contracts/auth';
import { NOTIFICATION_PATTERNS } from '@contracts/notification';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import {
   AUTH_METRICS_OTP_OPERATIONS,
   AUTH_METRICS_OTP_TYPES,
   AUTH_METRICS_STATUS,
   AuthRedisKeys,
} from '@auth/constants';
import {
   AUTH_METRICS_SERVICE,
   AUTH_RATE_LIMITER,
   type IAuthMetricsService,
   type IAuthRateLimiter,
   AuditLogService,
   PASSWORD_HASHER,
   type IPasswordHasher,
   TOKEN_LIFECYCLE_SERVICE,
} from '@auth/services/infrastructure';
import { PasswordChangeSaga } from '@auth/sagas';
import { Password } from '@auth/domain/value-objects';
import { AUTH_DOMAIN_EVENTS, PasswordChangedEvent } from '@auth/domain/events';

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
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly config: AuthConfigService,
      private readonly eventEmitter: EventEmitter2,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
   ) {}

   async changePassword(
      accountId: string,
      dto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<ChangePasswordResponseDto> {
      const startTime = this.metricsService.startTimer();
      await this.rateLimiter.checkChangePassword(accountId);

      const account = await this.accountRepository.findById(accountId);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const isOldValid = await this.passwordHasher.verify(account.passwordHash, dto.currentPassword);
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
            params: { cooldownSeconds: ttl > 0 ? ttl : REDIS_TTL.OTP_CHANGE_PASSWORD_COOLDOWN },
         });
      }

      const hashStartTime = this.metricsService.startTimer();
      const newPasswordHash = await newPassword.hash(this.passwordHasher);
      this.metricsService.observePasswordHash(this.metricsService.calculateDuration(hashStartTime));

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

      this.metricsService.observeOtpOperation(
         AUTH_METRICS_OTP_OPERATIONS.SEND,
         this.metricsService.calculateDuration(startTime),
      );
      this.metricsService.recordOtpOperation(
         AUTH_METRICS_OTP_OPERATIONS.SEND,
         AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
         AUTH_METRICS_STATUS.SUCCESS,
      );

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
      const startTime = this.metricsService.startTimer();
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
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.FAILURE,
         );
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
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.FAILURE,
         );
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
            .record({
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
            })
            .catch((err: unknown) => {
               this.logger.error('Failed to record password change audit log (non-blocking)', err);
            });

         this.metricsService.observeOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            this.metricsService.calculateDuration(startTime),
         );
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.SUCCESS,
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
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.FAILURE,
         );
         // Trigger compensating transaction to revert password in DB if it succeeded before token revocation failed
         await saga.rollback();
         throw error;
      }
   }
}
