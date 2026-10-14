import {
   AuthMetricOtpOperation,
   AuthMetricOtpType,
   AuthMetricReason,
   AuthMetricSessionOperation,
   AuthMetricStatus,
   AuthMetricTokenOperation,
   AuthMetricTokenType,
} from '@auth/constants';

export const AUTH_METRICS_SERVICE = Symbol('AUTH_METRICS_SERVICE');

export type MetricStatus = AuthMetricStatus;
export type TokenOperation = AuthMetricTokenOperation;
export type OtpOperation = AuthMetricOtpOperation;
export type OtpType = AuthMetricOtpType;
export type SessionOperation = AuthMetricSessionOperation;
export type TokenGenerationType = AuthMetricTokenType;

export interface IAuthMetricsService {
   readonly contentType: string;
   getMetrics(): Promise<string>;

   // Counter methods
   recordLoginAttempt(status: MetricStatus, reason?: AuthMetricReason): void;
   recordRegistrationAttempt(status: MetricStatus, reason?: AuthMetricReason): void;
   recordTokenOperation(operation: TokenOperation, status: MetricStatus): void;
   recordOtpOperation(operation: OtpOperation, type: OtpType, status: MetricStatus): void;
   recordSessionOperation(operation: SessionOperation, status: MetricStatus): void;

   // Gauge methods
   setActiveSessions(count: number): void;
   setLockedAccounts(count: number): void;
   setOutboxPending(count: number): void;

   // Histogram methods
   observeTokenGeneration(operation: TokenGenerationType, durationSeconds: number): void;
   observeLoginDuration(durationSeconds: number): void;
   observePasswordHash(durationSeconds: number): void;
   observeOtpOperation(operation: OtpOperation, durationSeconds: number): void;

   // Utility methods
   startTimer(): number;
   calculateDuration(startTime: number): number;
   reset(): void;
}
