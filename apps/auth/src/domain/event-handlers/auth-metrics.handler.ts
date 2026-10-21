import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
   AUTH_METRICS_OTP_OPERATIONS,
   AUTH_METRICS_REASONS,
   AUTH_METRICS_SESSION_OPERATIONS,
   AUTH_METRICS_STATUS,
   type AuthMetricReason,
} from '@auth/constants';
import {
   AUTH_DOMAIN_EVENTS,
   AccountLockedEvent,
   ActiveSessionsCountedEvent,
   LoginFailedEvent,
   LoginSuccessEvent,
   OtpFailedEvent,
   OtpGeneratedEvent,
   OtpVerifiedEvent,
   SessionRevokeFailedEvent,
   SessionRevokedEvent,
   SessionsRevokedAllEvent,
   SessionsRevokedOthersEvent,
   UserRegisteredEvent,
   UserRegistrationFailedEvent,
} from '@auth/domain/events';
import { AUTH_METRICS_SERVICE, type IAuthMetricsService } from '@auth/services/infrastructure/auth-metrics.interface';

/**
 * Observer Pattern: AuthMetricsHandler (Observer)
 *
 * Subscribes to Auth Domain Events and updates Prometheus metrics independently,
 * completely decoupling domain business logic from metrics instrumentation.
 */
@Injectable()
export class AuthMetricsHandler {
   private readonly logger = new Logger(AuthMetricsHandler.name);

   constructor(
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
   ) {}

   @OnEvent(AUTH_DOMAIN_EVENTS.LOGIN_SUCCESS, { async: true })
   handleLoginSuccess(event: LoginSuccessEvent): void {
      try {
         this.metricsService.recordLoginAttempt(AUTH_METRICS_STATUS.SUCCESS);
         if (typeof event.durationSeconds === 'number' && event.durationSeconds >= 0) {
            this.metricsService.observeLoginDuration(event.durationSeconds);
         }
      } catch (err) {
         this.logger.error('Failed to record login success metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.LOGIN_FAILED, { async: true })
   handleLoginFailed(event: LoginFailedEvent): void {
      try {
         const reason = this.mapLoginFailureReason(event.reason);
         this.metricsService.recordLoginAttempt(AUTH_METRICS_STATUS.FAILURE, reason);
      } catch (err) {
         this.logger.error('Failed to record login failure metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.USER_REGISTERED, { async: true })
   @OnEvent(AUTH_DOMAIN_EVENTS.SUPPLIER_REGISTERED, { async: true })
   handleUserRegistered(_event: UserRegisteredEvent): void {
      try {
         this.metricsService.recordRegistrationAttempt(AUTH_METRICS_STATUS.SUCCESS);
      } catch (err) {
         this.logger.error('Failed to record user registered metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.USER_REGISTRATION_FAILED, { async: true })
   @OnEvent(AUTH_DOMAIN_EVENTS.SUPPLIER_REGISTRATION_FAILED, { async: true })
   handleUserRegistrationFailed(event: UserRegistrationFailedEvent): void {
      try {
         const reason = this.mapRegistrationFailureReason(event.reason);
         this.metricsService.recordRegistrationAttempt(AUTH_METRICS_STATUS.FAILURE, reason);
      } catch (err) {
         this.logger.error('Failed to record user registration failed metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.ACCOUNT_LOCKED, { async: true })
   handleAccountLocked(_event: AccountLockedEvent): void {
      try {
         this.logger.debug('Observed account locked event for metrics');
      } catch (err) {
         this.logger.error('Failed to record account locked metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.SESSION_REVOKED, { async: true })
   handleSessionRevoked(_event: SessionRevokedEvent): void {
      try {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      } catch (err) {
         this.logger.error('Failed to record session revoked metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.SESSIONS_REVOKED_OTHERS, { async: true })
   handleSessionsRevokedOthers(_event: SessionsRevokedOthersEvent): void {
      try {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      } catch (err) {
         this.logger.error('Failed to record revoke other sessions metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.SESSIONS_REVOKED_ALL, { async: true })
   handleSessionsRevokedAll(_event: SessionsRevokedAllEvent): void {
      try {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      } catch (err) {
         this.logger.error('Failed to record revoke all sessions metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.ACTIVE_SESSIONS_COUNTED, { async: true })
   handleActiveSessionsCounted(event: ActiveSessionsCountedEvent): void {
      try {
         this.metricsService.setActiveSessions(event.count);
      } catch (err) {
         this.logger.error('Failed to record active sessions gauge', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.SESSION_REVOKE_FAILED, { async: true })
   handleSessionRevokeFailed(event: SessionRevokeFailedEvent): void {
      try {
         this.metricsService.recordSessionOperation(event.operation, AUTH_METRICS_STATUS.FAILURE);
      } catch (err) {
         this.logger.error('Failed to record session revoke failure metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.OTP_GENERATED, { async: true })
   handleOtpGenerated(event: OtpGeneratedEvent): void {
      try {
         if (typeof event.durationSeconds === 'number' && event.durationSeconds >= 0) {
            this.metricsService.observeOtpOperation(AUTH_METRICS_OTP_OPERATIONS.SEND, event.durationSeconds);
         }
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            event.type,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      } catch (err) {
         this.logger.error('Failed to record OTP generated metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.OTP_VERIFIED, { async: true })
   handleOtpVerified(event: OtpVerifiedEvent): void {
      try {
         if (typeof event.durationSeconds === 'number' && event.durationSeconds >= 0) {
            this.metricsService.observeOtpOperation(AUTH_METRICS_OTP_OPERATIONS.VERIFY, event.durationSeconds);
         }
         this.metricsService.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            event.type,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      } catch (err) {
         this.logger.error('Failed to record OTP verified metrics', err);
      }
   }

   @OnEvent(AUTH_DOMAIN_EVENTS.OTP_FAILED, { async: true })
   handleOtpFailed(event: OtpFailedEvent): void {
      try {
         this.metricsService.recordOtpOperation(event.operation, event.type, AUTH_METRICS_STATUS.FAILURE);
      } catch (err) {
         this.logger.error('Failed to record OTP failed metrics', err);
      }
   }

   private mapLoginFailureReason(reasonStr: string): AuthMetricReason {
      const lower = (reasonStr || '').toLowerCase();
      if (lower.includes('lock') || lower.includes('account_locked')) {
         return AUTH_METRICS_REASONS.ACCOUNT_LOCKED;
      }
      if (
         lower.includes('invalid_credentials') ||
         lower.includes('password') ||
         lower.includes('user_not_found') ||
         lower.includes('not_found')
      ) {
         return AUTH_METRICS_REASONS.INVALID_CREDENTIALS;
      }
      return AUTH_METRICS_REASONS.UNKNOWN;
   }

   private mapRegistrationFailureReason(reasonStr: string): AuthMetricReason {
      const lower = (reasonStr || '').toLowerCase();
      if (lower.includes('email') || lower.includes('exists') || lower.includes('already')) {
         return AUTH_METRICS_REASONS.EMAIL_EXISTS;
      }
      return AUTH_METRICS_REASONS.UNKNOWN;
   }
}
