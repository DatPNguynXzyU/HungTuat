import { Test, TestingModule } from '@nestjs/testing';
import {
   AUTH_METRICS_OTP_OPERATIONS,
   AUTH_METRICS_OTP_TYPES,
   AUTH_METRICS_REASONS,
   AUTH_METRICS_SESSION_OPERATIONS,
   AUTH_METRICS_STATUS,
} from '@auth/constants';
import {
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
import { AuthMetricsHandler } from '@auth/domain/event-handlers/auth-metrics.handler';

describe('AuthMetricsHandler (Observer)', () => {
   let handler: AuthMetricsHandler;
   let mockMetricsService: jest.Mocked<IAuthMetricsService>;

   beforeEach(async () => {
      mockMetricsService = {
         contentType: 'text/plain',
         getMetrics: jest.fn(),
         recordLoginAttempt: jest.fn(),
         recordRegistrationAttempt: jest.fn(),
         recordTokenOperation: jest.fn(),
         recordOtpOperation: jest.fn(),
         recordSessionOperation: jest.fn(),
         setActiveSessions: jest.fn(),
         setLockedAccounts: jest.fn(),
         setOutboxPending: jest.fn(),
         observeTokenGeneration: jest.fn(),
         observeLoginDuration: jest.fn(),
         observePasswordHash: jest.fn(),
         observeOtpOperation: jest.fn(),
         startTimer: jest.fn(),
         calculateDuration: jest.fn(),
         reset: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthMetricsHandler,
            {
               provide: AUTH_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      handler = module.get<AuthMetricsHandler>(AuthMetricsHandler);
   });

   describe('Login metrics observation', () => {
      it('should record success and duration when LoginSuccessEvent is received', () => {
         const event = new LoginSuccessEvent('acc-1', 'test@example.com', new Date(), '127.0.0.1', undefined, 0.45);
         handler.handleLoginSuccess(event);

         expect(mockMetricsService.recordLoginAttempt).toHaveBeenCalledWith(AUTH_METRICS_STATUS.SUCCESS);
         expect(mockMetricsService.observeLoginDuration).toHaveBeenCalledWith(0.45);
      });

      it('should record failure with mapped reasons when LoginFailedEvent is received', () => {
         const lockedEvent = new LoginFailedEvent('test@example.com', 'account_locked', new Date());
         handler.handleLoginFailed(lockedEvent);
         expect(mockMetricsService.recordLoginAttempt).toHaveBeenCalledWith(
            AUTH_METRICS_STATUS.FAILURE,
            AUTH_METRICS_REASONS.ACCOUNT_LOCKED,
         );

         const credsEvent = new LoginFailedEvent('test@example.com', 'invalid_credentials', new Date());
         handler.handleLoginFailed(credsEvent);
         expect(mockMetricsService.recordLoginAttempt).toHaveBeenCalledWith(
            AUTH_METRICS_STATUS.FAILURE,
            AUTH_METRICS_REASONS.INVALID_CREDENTIALS,
         );
      });
   });

   describe('Registration metrics observation', () => {
      it('should record success when UserRegisteredEvent is received', () => {
         const event = new UserRegisteredEvent('acc-1', 'test@example.com', new Date());
         handler.handleUserRegistered(event);

         expect(mockMetricsService.recordRegistrationAttempt).toHaveBeenCalledWith(AUTH_METRICS_STATUS.SUCCESS);
      });

      it('should record failure with mapped reason when UserRegistrationFailedEvent is received', () => {
         const event = new UserRegistrationFailedEvent('test@example.com', 'email_already_exists', new Date());
         handler.handleUserRegistrationFailed(event);

         expect(mockMetricsService.recordRegistrationAttempt).toHaveBeenCalledWith(
            AUTH_METRICS_STATUS.FAILURE,
            AUTH_METRICS_REASONS.EMAIL_EXISTS,
         );
      });
   });

   describe('Session metrics observation', () => {
      it('should record session revoked when SessionRevokedEvent is received', () => {
         const event = new SessionRevokedEvent('acc-1', 'sess-1', 'user_action', new Date());
         handler.handleSessionRevoked(event);

         expect(mockMetricsService.recordSessionOperation).toHaveBeenCalledWith(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record session revoke others and revoke all', () => {
         handler.handleSessionsRevokedOthers(new SessionsRevokedOthersEvent('acc-1', 'jti-1', 2));
         expect(mockMetricsService.recordSessionOperation).toHaveBeenCalledWith(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER,
            AUTH_METRICS_STATUS.SUCCESS,
         );

         handler.handleSessionsRevokedAll(new SessionsRevokedAllEvent('acc-1'));
         expect(mockMetricsService.recordSessionOperation).toHaveBeenCalledWith(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should update active sessions count', () => {
         handler.handleActiveSessionsCounted(new ActiveSessionsCountedEvent(5));
         expect(mockMetricsService.setActiveSessions).toHaveBeenCalledWith(5);
      });

      it('should record session revoke failure', () => {
         handler.handleSessionRevokeFailed(
            new SessionRevokeFailedEvent('acc-1', AUTH_METRICS_SESSION_OPERATIONS.REVOKE, new Error('DB error')),
         );
         expect(mockMetricsService.recordSessionOperation).toHaveBeenCalledWith(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('OTP metrics observation', () => {
      it('should record OTP generated', () => {
         handler.handleOtpGenerated(new OtpGeneratedEvent(AUTH_METRICS_OTP_TYPES.REGISTER, 0.25, 'test@example.com'));
         expect(mockMetricsService.observeOtpOperation).toHaveBeenCalledWith(AUTH_METRICS_OTP_OPERATIONS.SEND, 0.25);
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record OTP verified', () => {
         handler.handleOtpVerified(new OtpVerifiedEvent(AUTH_METRICS_OTP_TYPES.REGISTER, 0.12, 'test@example.com'));
         expect(mockMetricsService.observeOtpOperation).toHaveBeenCalledWith(AUTH_METRICS_OTP_OPERATIONS.VERIFY, 0.12);
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record OTP failed', () => {
         handler.handleOtpFailed(
            new OtpFailedEvent(
               AUTH_METRICS_OTP_OPERATIONS.VERIFY,
               AUTH_METRICS_OTP_TYPES.REGISTER,
               'test@example.com',
               'invalid_otp',
            ),
         );
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('Account locked observation', () => {
      it('should handle AccountLockedEvent safely without error', () => {
         const event = new AccountLockedEvent(
            'acc-1',
            'test@example.com',
            '127.0.0.1',
            'max_failed_attempts',
            new Date(Date.now() + 300000),
            5,
         );
         expect(() => handler.handleAccountLocked(event)).not.toThrow();
      });
   });
});
