import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClientProxy } from '@nestjs/microservices';
import {
   BadRequestException,
   DEFAULT_ROLES,
   OtpUtil,
   RedisService,
   SERVICES,
   RbacCacheService,
   UnauthorizedException,
} from '@common';
import {
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_AGGREGATES,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AUTH_SECURITY,
   USER_STATUS,
   RegisterDto,
   SendRegisterOtpDto,
   type SendRegisterOtpResponseDto,
   VerifyRegisterOtpDto,
   type VerifyRegisterOtpResponseDto,
   type IAuthResult,
} from '@contracts/auth';
import { NOTIFICATION_EVENTS, NOTIFICATION_PATTERNS } from '@contracts/notification';
import type { IDeviceInfo } from '@common';
import { ACCOUNT_REPOSITORY, type IAccountRepository, RBAC_REPOSITORY, type IRbacRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { OUTBOX_REPOSITORY, type IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';
import { OutboxPublisherService } from '@auth/outbox';
import {
   AUTH_METRICS_SERVICE,
   type IAuthMetricsService,
   AUTH_RATE_LIMITER,
   type IAuthRateLimiter,
   AuditLogService,
   EmailBloomFilterService,
   TOKEN_LIFECYCLE_SERVICE,
   VERIFICATION_TOKEN_SERVICE,
} from '@auth/services/infrastructure';
import {
   AUTH_METRICS_OTP_OPERATIONS,
   AUTH_METRICS_OTP_TYPES,
   AUTH_METRICS_REASONS,
   AUTH_METRICS_STATUS,
   AUTH_REDIS_TTL,
   type AuthMetricReason,
   AuthRedisKeys,
} from '@auth/constants';
import {
   PASSWORD_HASHER,
   type IPasswordHasher,
   type ITokenLifecycleService,
   type IVerificationTokenService,
} from '@auth/services/infrastructure';
import type { RoleEntity } from '@auth/entities';
import { RegisterSaga } from '@auth/sagas';
import { Email, Password, VerificationToken } from '@auth/domain/value-objects';
import { AUTH_DOMAIN_EVENTS, UserRegisteredEvent } from '@auth/domain/events';

@Injectable()
export class AuthRegistrationService {
   private readonly logger = new Logger(AuthRegistrationService.name);

   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      @Inject(RBAC_REPOSITORY)
      private readonly rbacRepository: IRbacRepository,
      @Inject(OUTBOX_REPOSITORY)
      private readonly outboxRepository: IOutboxRepository,
      private readonly rbacCacheService: RbacCacheService,
      @Inject(VERIFICATION_TOKEN_SERVICE)
      private readonly verificationTokenService: IVerificationTokenService,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      @Inject(PASSWORD_HASHER)
      private readonly passwordHasher: IPasswordHasher,
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
      private readonly emailBloomFilterService: EmailBloomFilterService,
      private readonly outboxPublisherService: OutboxPublisherService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly config: AuthConfigService,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   private async getOrCacheRole(roleCode: string): Promise<RoleEntity | null> {
      const cached = await this.rbacCacheService.getRole(roleCode);
      if (cached) {
         return cached;
      }

      const role = await this.rbacRepository.findRoleByCode(roleCode);
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
      const emailResult = Email.create(email);
      if (emailResult.isFailure()) {
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
            params: emailResult.getParams(),
         });
      }
      const normalizedEmail = emailResult.getValue().getValue();

      await this.rateLimiter.checkEmail(normalizedEmail);

      const available = await this.emailBloomFilterService.isEmailAvailable(normalizedEmail);
      return { available, email: normalizedEmail };
   }

   async sendRegisterOtp(dto: SendRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<SendRegisterOtpResponseDto> {
      const startTime = this.metricsService.startTimer();
      try {
         const emailResult = Email.create(dto.email);
         if (emailResult.isFailure()) {
            throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
               params: emailResult.getParams(),
            });
         }
         const normalizedEmail = emailResult.getValue().getValue();

         await this.rateLimiter.checkSendRegisterOtp(normalizedEmail);

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

         const cooldownKey = AuthRedisKeys.registerOtpCooldown(normalizedEmail);
         const remainingCooldown = await this.redisService.ttl(cooldownKey);
         if (remainingCooldown > 0) {
            throw new BadRequestException(AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE, {
               params: { remainingSeconds: remainingCooldown },
            });
         }

         const otp = OtpUtil.generate();
         const otpKey = AuthRedisKeys.registerOtp(normalizedEmail);
         const attemptsKey = AuthRedisKeys.registerOtpAttempts(normalizedEmail);

         await Promise.all([
            this.redisService.set(otpKey, otp, AUTH_REDIS_TTL.OTP_REGISTER),
            this.redisService.set(cooldownKey, '1', AUTH_REDIS_TTL.OTP_REGISTER_COOLDOWN),
            this.redisService.del(attemptsKey),
         ]);

         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_OTP_EMAIL, {
            to: normalizedEmail,
            otpCode: otp,
            expiresInMinutes: Math.round(AUTH_REDIS_TTL.OTP_REGISTER / 60),
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

         this.metricsService.observeOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            this.metricsService.calculateDuration(startTime),
         );
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.SUCCESS,
         );

         return {
            success: true,
            message: AUTH_RESPONSE_MESSAGES.SEND_OTP_SUCCESS,
            cooldownSeconds: AUTH_REDIS_TTL.OTP_REGISTER_COOLDOWN,
            expiresInMinutes: Math.round(AUTH_REDIS_TTL.OTP_REGISTER / 60),
         };
      } catch (error) {
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.FAILURE,
         );
         throw error;
      }
   }

   async verifyRegisterOtp(dto: VerifyRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<VerifyRegisterOtpResponseDto> {
      const startTime = this.metricsService.startTimer();
      try {
         const emailResult = Email.create(dto.email);
         if (emailResult.isFailure()) {
            throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
               params: emailResult.getParams(),
            });
         }
         const normalizedEmail = emailResult.getValue().getValue();

         await this.rateLimiter.checkVerifyRegisterOtp(normalizedEmail);

         const otpKey = AuthRedisKeys.registerOtp(normalizedEmail);
         const attemptsKey = AuthRedisKeys.registerOtpAttempts(normalizedEmail);

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

         const attempts = await this.redisService.incr(attemptsKey);
         if (attempts === 1) {
            await this.redisService.expire(attemptsKey, AUTH_REDIS_TTL.OTP_REGISTER);
         }

         if (attempts > AUTH_SECURITY.MAX_OTP_ATTEMPTS) {
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

         if (storedOtp !== dto.otp) {
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

         const verificationToken = await this.verificationTokenService.generate(
            normalizedEmail,
            AUTH_REDIS_TTL.OTP_VERIFICATION_TOKEN,
         );

         await Promise.all([this.redisService.del(otpKey), this.redisService.del(attemptsKey)]);

         await this.auditLogService.record({
            actorEmail: normalizedEmail,
            action: AUDIT_ACTIONS.AUTH_OTP_VERIFIED,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
         });

         this.metricsService.observeOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            this.metricsService.calculateDuration(startTime),
         );
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.SUCCESS,
         );

         return {
            success: true,
            verificationToken,
            expiresInSeconds: AUTH_REDIS_TTL.OTP_VERIFICATION_TOKEN,
         };
      } catch (error) {
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.FAILURE,
         );
         throw error;
      }
   }

   async register(dto: RegisterDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const emailResult = Email.create(dto.email);
      if (emailResult.isFailure()) {
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
            params: emailResult.getParams(),
         });
      }
      const email = emailResult.getValue();
      const normalizedEmail = email.getValue();

      let isEmailVerified = false;
      if (dto.verificationToken) {
         const tokenResult = VerificationToken.create(dto.verificationToken);
         if (tokenResult.isFailure()) {
            throw new BadRequestException(AUTH_ERROR_CODES.INVALID_VERIFICATION_TOKEN, {
               params: tokenResult.getParams(),
            });
         }
         const verificationToken = tokenResult.getValue();

         const storedEmail = await this.verificationTokenService.consume(verificationToken.getValue());
         if (!storedEmail) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.VERIFICATION_TOKEN_EXPIRED);
         }

         const storedEmailVO = Email.create(storedEmail);
         if (storedEmailVO.isFailure() || !email.equals(storedEmailVO.getValue())) {
            throw new BadRequestException(AUTH_ERROR_CODES.EMAIL_MISMATCH);
         }
         isEmailVerified = true;
      }

      const passwordResult = Password.create(dto.password);
      if (passwordResult.isFailure()) {
         throw new BadRequestException(AUTH_ERROR_CODES.WEAK_PASSWORD, {
            params: passwordResult.getParams(),
         });
      }
      const password = passwordResult.getValue();

      const mightContain = await this.emailBloomFilterService.mightContain(normalizedEmail);
      if (mightContain) {
         const existing = await this.accountRepository.findByEmail(normalizedEmail);
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
         password.hash(this.passwordHasher),
      ]);

      const saga = new RegisterSaga(this.accountRepository, this.tokenLifecycleService, this.outboxRepository);

      try {
         const newAccount = await this.outboxRepository.createAccountWithEvent(
            {
               email: normalizedEmail,
               passwordHash,
               roleId: defaultRole?.id,
               status: USER_STATUS.ACTIVE,
               isEmailVerified,
            },
            {
               aggregateType: AUTH_AGGREGATES.ACCOUNT,
               eventType: NOTIFICATION_EVENTS.USER_REGISTERED,
               payload: {
                  email: normalizedEmail,
               },
            },
         );
         saga.setAccount(newAccount);

         const accountRoles = newAccount.roles && newAccount.roles.length > 0 ? newAccount.roles : [DEFAULT_ROLES.USER];

         const tokens = await this.tokenLifecycleService.generateTokenPair(
            {
               id: newAccount.id,
               email: newAccount.email,
               roles: accountRoles,
            },
            deviceInfo,
         );
         saga.setTokens(tokens);

         await this.emailBloomFilterService.addEmail(normalizedEmail);
         this.logger.log(`Created account ${newAccount.email} with Outbox event; triggering publisher`);
         this.outboxPublisherService.triggerPublish();

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.USER_REGISTERED,
            new UserRegisteredEvent(newAccount.id, newAccount.email, new Date(), deviceInfo),
         );

         this.auditLogService
            .record({
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
            })
            .catch((err: unknown) => {
               this.logger.error('Failed to record register audit log (non-blocking)', err);
            });

         this.metricsService.recordRegistrationAttempt(AUTH_METRICS_STATUS.SUCCESS);

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
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
         };
      } catch (error) {
         if (saga) {
            await saga.rollback();
         }
         let reason: AuthMetricReason = AUTH_METRICS_REASONS.UNKNOWN;
         if (error instanceof BadRequestException) {
            const errCode = (error as { errorCode?: string }).errorCode;
            if (errCode === AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS) {
               reason = AUTH_METRICS_REASONS.EMAIL_EXISTS;
            } else if (errCode === AUTH_ERROR_CODES.OTP_INVALID) {
               reason = AUTH_METRICS_REASONS.INVALID_OTP;
            } else if (errCode === AUTH_ERROR_CODES.OTP_EXPIRED) {
               reason = AUTH_METRICS_REASONS.OTP_EXPIRED;
            }
         }
         this.metricsService.recordRegistrationAttempt(AUTH_METRICS_STATUS.FAILURE, reason);
         throw error;
      }
   }
}
