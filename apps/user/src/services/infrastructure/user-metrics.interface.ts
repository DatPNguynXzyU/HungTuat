import {
   UserMetricDomainOperation,
   UserMetricGraphOperation,
   UserMetricMediaOperation,
   UserMetricNotificationOperation,
   UserMetricSearchOperation,
   UserMetricStatus,
} from '@user/constants';
import type { IGrpcMetricsCollector } from '@common';

export const USER_METRICS_SERVICE = Symbol('USER_METRICS_SERVICE');

export interface IUserMetricsService extends IGrpcMetricsCollector {
   readonly contentType: string;
   getMetrics(): Promise<string>;

   // Counter methods
   recordMediaOperation(operation: UserMetricMediaOperation, status: UserMetricStatus): void;
   recordSearchOperation(operation: UserMetricSearchOperation, status: UserMetricStatus): void;
   recordNotificationOperation(operation: UserMetricNotificationOperation, status: UserMetricStatus): void;
   recordDomainOperation(operation: UserMetricDomainOperation, status: UserMetricStatus): void;
   recordGraphSyncOperation(operation: UserMetricGraphOperation, status: UserMetricStatus): void;

   // Histogram methods
   observeMediaDuration(durationSeconds: number): void;
   observeSearchDuration(durationSeconds: number): void;
   observeGraphSyncDuration(durationSeconds: number): void;

   // Gauge methods
   setTotalUsers(count: number): void;
   setTotalFollows(count: number): void;

   // Utility methods
   startTimer(): number;
   calculateDuration(startTime: number): number;
   reset(): void;
}
