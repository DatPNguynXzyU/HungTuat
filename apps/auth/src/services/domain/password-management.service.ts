import type { ITokenService } from '@auth/services/infrastructure';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   Argon2Util,
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AUTH_SECURITY,
   BadRequestException,
   NOTIFICATION_PATTERNS,
   OtpUtil,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   SERVICES,
   UnauthorizedException,
} from '@common';
import type {
   IDeviceInfo,
   ChangePasswordDto,
   ChangePasswordResponseDto,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
} from '@common';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';

@Injectable()
export class PasswordManagementService {
   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: AuthRepository,
      @Inject(TOKEN_SERVICE)
      private readonly tokenService: ITokenService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly config: AuthConfigService,
   ) {}

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

      await this.authRepository.updateAccount(accountId, { passwordHash: pendingData.newPasswordHash });

      await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);

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
}
