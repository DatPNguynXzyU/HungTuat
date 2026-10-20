import { Registry } from 'prom-client';
import {
   AUTH_METRICS_DEFAULT_REASON,
   AUTH_METRICS_LABELS,
   AUTH_METRICS_NAMES,
   AUTH_METRICS_OTP_OPERATIONS,
   AUTH_METRICS_OTP_TYPES,
   AUTH_METRICS_REASONS,
   AUTH_METRICS_SESSION_OPERATIONS,
   AUTH_METRICS_STATUS,
   AUTH_METRICS_TOKEN_OPERATIONS,
   AUTH_METRICS_TOKEN_TYPES,
} from '@auth/constants';
import { AuthMetricsService } from '@auth/services/infrastructure/auth-metrics.service';

describe('AuthMetricsService', () => {
   let service: AuthMetricsService;
   let registry: Registry;

   beforeEach(() => {
      registry = new Registry();
      service = new AuthMetricsService(registry);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service.contentType).toBe(registry.contentType);
   });

   describe('Counters', () => {
      it('should record login attempts', async () => {
         service.recordLoginAttempt(AUTH_METRICS_STATUS.SUCCESS);
         service.recordLoginAttempt(AUTH_METRICS_STATUS.FAILURE, AUTH_METRICS_REASONS.INVALID_CREDENTIALS);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.LOGIN_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_DEFAULT_REASON}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.LOGIN_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.FAILURE}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_REASONS.INVALID_CREDENTIALS}"} 1`,
         );
      });

      it('should record registration attempts', async () => {
         service.recordRegistrationAttempt(AUTH_METRICS_STATUS.SUCCESS);
         service.recordRegistrationAttempt(AUTH_METRICS_STATUS.FAILURE, AUTH_METRICS_REASONS.EMAIL_EXISTS);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.REGISTRATION_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_DEFAULT_REASON}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.REGISTRATION_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.FAILURE}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_REASONS.EMAIL_EXISTS}"} 1`,
         );
      });

      it('should record token operations', async () => {
         service.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.GENERATE, AUTH_METRICS_STATUS.SUCCESS);
         service.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REFRESH, AUTH_METRICS_STATUS.SUCCESS);
         service.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REVOKE, AUTH_METRICS_STATUS.FAILURE);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.TOKEN_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_TOKEN_OPERATIONS.GENERATE}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.TOKEN_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_TOKEN_OPERATIONS.REFRESH}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.TOKEN_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_TOKEN_OPERATIONS.REVOKE}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.FAILURE}"} 1`,
         );
      });

      it('should record OTP operations', async () => {
         service.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            AUTH_METRICS_OTP_TYPES.REGISTER,
            AUTH_METRICS_STATUS.SUCCESS,
         );
         service.recordOtpOperation(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.FAILURE,
         );

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.OTP_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_OTP_OPERATIONS.SEND}",${AUTH_METRICS_LABELS.TYPE}="${AUTH_METRICS_OTP_TYPES.REGISTER}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.OTP_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_OTP_OPERATIONS.VERIFY}",${AUTH_METRICS_LABELS.TYPE}="${AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.FAILURE}"} 1`,
         );
      });

      it('should record session operations', async () => {
         service.recordSessionOperation(AUTH_METRICS_SESSION_OPERATIONS.REVOKE, AUTH_METRICS_STATUS.SUCCESS);
         service.recordSessionOperation(AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER, AUTH_METRICS_STATUS.SUCCESS);
         service.recordSessionOperation(AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL, AUTH_METRICS_STATUS.FAILURE);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.SESSION_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_SESSION_OPERATIONS.REVOKE}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.SESSION_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.SESSION_OPERATIONS}{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL}",${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.FAILURE}"} 1`,
         );
      });
   });

   describe('Gauges', () => {
      it('should set active sessions gauge', async () => {
         service.setActiveSessions(42);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${AUTH_METRICS_NAMES.ACTIVE_SESSIONS} 42`);
      });

      it('should set locked accounts gauge', async () => {
         service.setLockedAccounts(5);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${AUTH_METRICS_NAMES.LOCKED_ACCOUNTS} 5`);
      });

      it('should set outbox pending events gauge', async () => {
         service.setOutboxPending(12);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${AUTH_METRICS_NAMES.OUTBOX_PENDING} 12`);
      });
   });

   describe('Histograms', () => {
      it('should observe token generation duration', async () => {
         service.observeTokenGeneration(AUTH_METRICS_TOKEN_TYPES.ACCESS, 0.025);
         service.observeTokenGeneration(AUTH_METRICS_TOKEN_TYPES.REFRESH, 0.015);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.TOKEN_GENERATION_DURATION}_count{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_TOKEN_TYPES.ACCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.TOKEN_GENERATION_DURATION}_count{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_TOKEN_TYPES.REFRESH}"} 1`,
         );
      });

      it('should observe login duration', async () => {
         service.observeLoginDuration(0.35);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${AUTH_METRICS_NAMES.LOGIN_DURATION}_count 1`);
      });

      it('should observe password hash duration', async () => {
         service.observePasswordHash(0.2);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${AUTH_METRICS_NAMES.PASSWORD_HASH_DURATION}_count 1`);
      });

      it('should observe OTP operation duration', async () => {
         service.observeOtpOperation(AUTH_METRICS_OTP_OPERATIONS.SEND, 0.15);
         service.observeOtpOperation(AUTH_METRICS_OTP_OPERATIONS.VERIFY, 0.05);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.OTP_OPERATION_DURATION}_count{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_OTP_OPERATIONS.SEND}"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.OTP_OPERATION_DURATION}_count{${AUTH_METRICS_LABELS.OPERATION}="${AUTH_METRICS_OTP_OPERATIONS.VERIFY}"} 1`,
         );
      });

      it('should record gRPC metrics properly', async () => {
         service.recordGrpcCall({
            service: 'AuthGrpcController',
            method: 'checkEmail',
            status: 'OK',
            durationSeconds: 0.042,
         });

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.GRPC_REQUESTS}{${AUTH_METRICS_LABELS.SERVICE}="AuthGrpcController",${AUTH_METRICS_LABELS.METHOD}="checkEmail",${AUTH_METRICS_LABELS.STATUS}="OK"} 1`,
         );
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.GRPC_REQUEST_DURATION}_count{${AUTH_METRICS_LABELS.SERVICE}="AuthGrpcController",${AUTH_METRICS_LABELS.METHOD}="checkEmail",${AUTH_METRICS_LABELS.STATUS}="OK"} 1`,
         );
      });
   });

   describe('Utilities', () => {
      it('should start timer and calculate duration', () => {
         const startTime = service.startTimer();
         expect(typeof startTime).toBe('number');
         const duration = service.calculateDuration(startTime);
         expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should reset metrics without error', async () => {
         service.recordLoginAttempt(AUTH_METRICS_STATUS.SUCCESS);
         let metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${AUTH_METRICS_NAMES.LOGIN_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_DEFAULT_REASON}"} 1`,
         );

         service.reset();
         metrics = await service.getMetrics();
         expect(metrics).not.toContain(
            `${AUTH_METRICS_NAMES.LOGIN_ATTEMPTS}{${AUTH_METRICS_LABELS.STATUS}="${AUTH_METRICS_STATUS.SUCCESS}",${AUTH_METRICS_LABELS.REASON}="${AUTH_METRICS_DEFAULT_REASON}"} 1`,
         );
      });
   });
});
