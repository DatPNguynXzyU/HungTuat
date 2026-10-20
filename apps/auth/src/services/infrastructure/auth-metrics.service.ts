import { Injectable, Optional } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import {
   AUTH_METRICS_BUCKETS,
   AUTH_METRICS_DEFAULT_REASON,
   AUTH_METRICS_HELP,
   AUTH_METRICS_LABELS,
   AUTH_METRICS_NAMES,
   AUTH_METRICS_PREFIX,
} from '@auth/constants';
import {
   IAuthMetricsService,
   MetricStatus,
   OtpOperation,
   OtpType,
   SessionOperation,
   TokenGenerationType,
   TokenOperation,
} from '@auth/services/infrastructure/auth-metrics.interface';

@Injectable()
export class AuthMetricsService implements IAuthMetricsService {
   private readonly registry: Registry;

   // Counters
   private readonly loginAttemptsCounter: Counter<string>;
   private readonly registrationAttemptsCounter: Counter<string>;
   private readonly tokenOperationsCounter: Counter<string>;
   private readonly otpOperationsCounter: Counter<string>;
   private readonly sessionOperationsCounter: Counter<string>;

   // Gauges
   private readonly activeSessionsGauge: Gauge<string>;
   private readonly lockedAccountsGauge: Gauge<string>;
   private readonly outboxPendingGauge: Gauge<string>;

   // Histograms
   private readonly tokenGenerationHistogram: Histogram<string>;
   private readonly loginDurationHistogram: Histogram<string>;
   private readonly passwordHashHistogram: Histogram<string>;
   private readonly otpOperationHistogram: Histogram<string>;
   private readonly grpcRequestsCounter: Counter<string>;
   private readonly grpcDurationHistogram: Histogram<string>;

   constructor(@Optional() customRegistry?: Registry) {
      this.registry = customRegistry || new Registry();

      // Collect default node runtime metrics under configured prefix
      collectDefaultMetrics({
         register: this.registry,
         prefix: AUTH_METRICS_PREFIX,
      });

      // Counters
      this.loginAttemptsCounter = new Counter({
         name: AUTH_METRICS_NAMES.LOGIN_ATTEMPTS,
         help: AUTH_METRICS_HELP.LOGIN_ATTEMPTS,
         labelNames: [AUTH_METRICS_LABELS.STATUS, AUTH_METRICS_LABELS.REASON],
         registers: [this.registry],
      });

      this.registrationAttemptsCounter = new Counter({
         name: AUTH_METRICS_NAMES.REGISTRATION_ATTEMPTS,
         help: AUTH_METRICS_HELP.REGISTRATION_ATTEMPTS,
         labelNames: [AUTH_METRICS_LABELS.STATUS, AUTH_METRICS_LABELS.REASON],
         registers: [this.registry],
      });

      this.tokenOperationsCounter = new Counter({
         name: AUTH_METRICS_NAMES.TOKEN_OPERATIONS,
         help: AUTH_METRICS_HELP.TOKEN_OPERATIONS,
         labelNames: [AUTH_METRICS_LABELS.OPERATION, AUTH_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.otpOperationsCounter = new Counter({
         name: AUTH_METRICS_NAMES.OTP_OPERATIONS,
         help: AUTH_METRICS_HELP.OTP_OPERATIONS,
         labelNames: [AUTH_METRICS_LABELS.OPERATION, AUTH_METRICS_LABELS.TYPE, AUTH_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.sessionOperationsCounter = new Counter({
         name: AUTH_METRICS_NAMES.SESSION_OPERATIONS,
         help: AUTH_METRICS_HELP.SESSION_OPERATIONS,
         labelNames: [AUTH_METRICS_LABELS.OPERATION, AUTH_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      // Gauges
      this.activeSessionsGauge = new Gauge({
         name: AUTH_METRICS_NAMES.ACTIVE_SESSIONS,
         help: AUTH_METRICS_HELP.ACTIVE_SESSIONS,
         registers: [this.registry],
      });

      this.lockedAccountsGauge = new Gauge({
         name: AUTH_METRICS_NAMES.LOCKED_ACCOUNTS,
         help: AUTH_METRICS_HELP.LOCKED_ACCOUNTS,
         registers: [this.registry],
      });

      this.outboxPendingGauge = new Gauge({
         name: AUTH_METRICS_NAMES.OUTBOX_PENDING,
         help: AUTH_METRICS_HELP.OUTBOX_PENDING,
         registers: [this.registry],
      });

      // Histograms
      this.tokenGenerationHistogram = new Histogram({
         name: AUTH_METRICS_NAMES.TOKEN_GENERATION_DURATION,
         help: AUTH_METRICS_HELP.TOKEN_GENERATION_DURATION,
         labelNames: [AUTH_METRICS_LABELS.OPERATION],
         buckets: AUTH_METRICS_BUCKETS.TOKEN_GENERATION,
         registers: [this.registry],
      });

      this.loginDurationHistogram = new Histogram({
         name: AUTH_METRICS_NAMES.LOGIN_DURATION,
         help: AUTH_METRICS_HELP.LOGIN_DURATION,
         buckets: AUTH_METRICS_BUCKETS.LOGIN_DURATION,
         registers: [this.registry],
      });

      this.passwordHashHistogram = new Histogram({
         name: AUTH_METRICS_NAMES.PASSWORD_HASH_DURATION,
         help: AUTH_METRICS_HELP.PASSWORD_HASH_DURATION,
         buckets: AUTH_METRICS_BUCKETS.PASSWORD_HASH,
         registers: [this.registry],
      });

      this.otpOperationHistogram = new Histogram({
         name: AUTH_METRICS_NAMES.OTP_OPERATION_DURATION,
         help: AUTH_METRICS_HELP.OTP_OPERATION_DURATION,
         labelNames: [AUTH_METRICS_LABELS.OPERATION],
         buckets: AUTH_METRICS_BUCKETS.OTP_OPERATION,
         registers: [this.registry],
      });

      this.grpcRequestsCounter = new Counter({
         name: AUTH_METRICS_NAMES.GRPC_REQUESTS,
         help: AUTH_METRICS_HELP.GRPC_REQUESTS,
         labelNames: [AUTH_METRICS_LABELS.SERVICE, AUTH_METRICS_LABELS.METHOD, AUTH_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.grpcDurationHistogram = new Histogram({
         name: AUTH_METRICS_NAMES.GRPC_REQUEST_DURATION,
         help: AUTH_METRICS_HELP.GRPC_REQUEST_DURATION,
         labelNames: [AUTH_METRICS_LABELS.SERVICE, AUTH_METRICS_LABELS.METHOD, AUTH_METRICS_LABELS.STATUS],
         buckets: AUTH_METRICS_BUCKETS.GRPC_REQUEST_DURATION,
         registers: [this.registry],
      });
   }

   get contentType(): string {
      return this.registry.contentType;
   }

   getMetrics(): Promise<string> {
      return this.registry.metrics();
   }

   // Counter methods
   recordLoginAttempt(status: MetricStatus, reason = AUTH_METRICS_DEFAULT_REASON): void {
      this.loginAttemptsCounter.inc({
         [AUTH_METRICS_LABELS.STATUS]: status,
         [AUTH_METRICS_LABELS.REASON]: reason,
      });
   }

   recordRegistrationAttempt(status: MetricStatus, reason = AUTH_METRICS_DEFAULT_REASON): void {
      this.registrationAttemptsCounter.inc({
         [AUTH_METRICS_LABELS.STATUS]: status,
         [AUTH_METRICS_LABELS.REASON]: reason,
      });
   }

   recordTokenOperation(operation: TokenOperation, status: MetricStatus): void {
      this.tokenOperationsCounter.inc({
         [AUTH_METRICS_LABELS.OPERATION]: operation,
         [AUTH_METRICS_LABELS.STATUS]: status,
      });
   }

   recordOtpOperation(operation: OtpOperation, type: OtpType, status: MetricStatus): void {
      this.otpOperationsCounter.inc({
         [AUTH_METRICS_LABELS.OPERATION]: operation,
         [AUTH_METRICS_LABELS.TYPE]: type,
         [AUTH_METRICS_LABELS.STATUS]: status,
      });
   }

   recordSessionOperation(operation: SessionOperation, status: MetricStatus): void {
      this.sessionOperationsCounter.inc({
         [AUTH_METRICS_LABELS.OPERATION]: operation,
         [AUTH_METRICS_LABELS.STATUS]: status,
      });
   }

   // Gauge methods
   setActiveSessions(count: number): void {
      this.activeSessionsGauge.set(count);
   }

   setLockedAccounts(count: number): void {
      this.lockedAccountsGauge.set(count);
   }

   setOutboxPending(count: number): void {
      this.outboxPendingGauge.set(count);
   }

   // Histogram methods
   observeTokenGeneration(operation: TokenGenerationType, durationSeconds: number): void {
      this.tokenGenerationHistogram.observe(
         {
            [AUTH_METRICS_LABELS.OPERATION]: operation,
         },
         durationSeconds,
      );
   }

   observeLoginDuration(durationSeconds: number): void {
      this.loginDurationHistogram.observe(durationSeconds);
   }

   observePasswordHash(durationSeconds: number): void {
      this.passwordHashHistogram.observe(durationSeconds);
   }

   observeOtpOperation(operation: OtpOperation, durationSeconds: number): void {
      this.otpOperationHistogram.observe(
         {
            [AUTH_METRICS_LABELS.OPERATION]: operation,
         },
         durationSeconds,
      );
   }

   recordGrpcCall(params: { service: string; method: string; status: string; durationSeconds: number }): void {
      this.grpcRequestsCounter.inc({
         [AUTH_METRICS_LABELS.SERVICE]: params.service,
         [AUTH_METRICS_LABELS.METHOD]: params.method,
         [AUTH_METRICS_LABELS.STATUS]: params.status,
      });
      this.grpcDurationHistogram.observe(
         {
            [AUTH_METRICS_LABELS.SERVICE]: params.service,
            [AUTH_METRICS_LABELS.METHOD]: params.method,
            [AUTH_METRICS_LABELS.STATUS]: params.status,
         },
         params.durationSeconds,
      );
   }

   // Utility methods
   startTimer(): number {
      return Date.now();
   }

   calculateDuration(startTime: number): number {
      return Math.max(0, (Date.now() - startTime) / 1000);
   }

   reset(): void {
      this.registry.resetMetrics();
   }
}
