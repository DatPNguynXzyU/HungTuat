import { Logger } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { AbstractChainHandler, type RedisService, UnauthorizedException } from '@common';
import { AUDIT_ACTIONS, AUTH_ERROR_CODES, AUTH_SECURITY } from '@contracts/auth';
import { AUTH_LOCKOUT_VALUE, AUTH_REDIS_TTL } from '@auth/constants';
import { AUTH_DOMAIN_EVENTS, AccountLockedEvent, LoginFailedEvent } from '@auth/domain/events';
import { AuditLogBuilder } from '@auth/builders/audit-log.builder';
import type { AuditLogService } from '@auth/services/infrastructure';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Base abstract handler for the login validation chain.
 * Encapsulates reusable telemetry, audit logging, domain event emission,
 * and failed attempt tracking across validation steps to ensure DRY compliance.
 */
export abstract class AbstractLoginValidationHandler extends AbstractChainHandler<LoginValidationContext, void> {
   protected readonly logger = new Logger(this.constructor.name);

   constructor(
      protected readonly redisService?: RedisService,
      protected readonly auditLogService?: AuditLogService,
      protected readonly eventEmitter?: EventEmitter2,
   ) {
      super();
   }

   /**
    * Records a failure audit log entry with standard request telemetry.
    */
   protected async recordFailureAuditLog(
      context: LoginValidationContext,
      reason: string,
      options?: {
         accountId?: string | null;
         metadata?: Record<string, unknown>;
      },
   ): Promise<void> {
      if (!this.auditLogService) {
         return;
      }
      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_LOGIN_FAILED)
            .asFailure(reason)
            .withActor(context.email, options?.accountId)
            .withIpAddress(context.clientIp)
            .withDeviceInfo(context.deviceInfo)
            .withMetadata(options?.metadata)
            .build(),
      );
   }

   /**
    * Emits a LoginFailedEvent for domain observers and metrics subscribers.
    */
   protected emitLoginFailed(context: LoginValidationContext, reason: string): void {
      if (!this.eventEmitter) {
         return;
      }
      this.eventEmitter.emit(
         AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
         new LoginFailedEvent(context.email, reason, new Date(), context.clientIp),
      );
   }

   /**
    * Tracks failed login attempts in Redis and enforces temporary lockouts.
    */
   protected async handleFailedAttempt(context: LoginValidationContext, accountId?: string): Promise<void> {
      if (!this.redisService) {
         return;
      }

      const attempts = await this.redisService.incr(context.failedAttemptsKey);
      if (attempts === 1) {
         await this.redisService.expire(context.failedAttemptsKey, AUTH_REDIS_TTL.AUTH_FAILED_ATTEMPTS);
      }

      if (attempts >= AUTH_SECURITY.MAX_FAILED_LOGIN_ATTEMPTS) {
         await Promise.all([
            this.redisService.set(context.lockoutKey, AUTH_LOCKOUT_VALUE, AUTH_REDIS_TTL.AUTH_LOCKOUT),
            this.redisService.del(context.failedAttemptsKey),
         ]);
         this.logger.warn(
            `Account ${context.email} temporarily locked for IP ${context.clientIp} after ${attempts} consecutive failed attempts.`,
         );

         if (this.auditLogService) {
            await this.auditLogService.record(
               AuditLogBuilder.create()
                  .withAction(AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED)
                  .asFailure(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY)
                  .withActor(context.email, accountId)
                  .withIpAddress(context.clientIp)
                  .withDeviceInfo(context.deviceInfo)
                  .withMetadata({
                     consecutiveFailedAttempts: attempts,
                     lockoutSeconds: AUTH_REDIS_TTL.AUTH_LOCKOUT,
                  })
                  .build(),
            );
         }

         if (this.eventEmitter) {
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.ACCOUNT_LOCKED,
               new AccountLockedEvent(
                  accountId || null,
                  context.email,
                  context.clientIp,
                  AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
                  new Date(Date.now() + AUTH_REDIS_TTL.AUTH_LOCKOUT * 1000),
                  attempts,
               ),
            );
         }

         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
            params: {
               email: context.email,
               ip: context.clientIp,
               remainingSeconds: AUTH_REDIS_TTL.AUTH_LOCKOUT,
               remainingMinutes: Math.ceil(AUTH_REDIS_TTL.AUTH_LOCKOUT / 60),
            },
         });
      }
   }

   /**
    * Handles credential validation failures (e.g. unknown email, wrong password).
    */
   protected async handleCredentialFailure(context: LoginValidationContext, accountId?: string): Promise<never> {
      await this.recordFailureAuditLog(context, AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
         accountId: accountId || null,
      });
      await this.handleFailedAttempt(context, accountId);
      this.emitLoginFailed(context, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
   }

   /**
    * Handles generic validation failures with full telemetry.
    */
   protected async handleFailure(
      context: LoginValidationContext,
      errorCode: string,
      options?: {
         accountId?: string;
         metadata?: Record<string, unknown>;
         params?: Record<string, unknown>;
      },
   ): Promise<never> {
      await this.recordFailureAuditLog(context, errorCode, {
         accountId: options?.accountId,
         metadata: options?.metadata,
      });
      this.emitLoginFailed(context, errorCode);
      throw new UnauthorizedException(errorCode, { params: options?.params });
   }
}
