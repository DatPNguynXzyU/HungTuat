import { Injectable, Optional } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import {
   USER_METRICS_BUCKETS,
   USER_METRICS_HELP,
   USER_METRICS_LABELS,
   USER_METRICS_NAMES,
   USER_METRICS_PREFIX,
   UserMetricDomainOperation,
   UserMetricGraphOperation,
   UserMetricMediaOperation,
   UserMetricNotificationOperation,
   UserMetricSearchOperation,
   UserMetricStatus,
} from '@user/constants';
import { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

@Injectable()
export class UserMetricsService implements IUserMetricsService {
   private readonly registry: Registry;

   // Counters
   private readonly mediaOperationsCounter: Counter<string>;
   private readonly searchOperationsCounter: Counter<string>;
   private readonly notificationOperationsCounter: Counter<string>;
   private readonly domainOperationsCounter: Counter<string>;
   private readonly graphSyncOperationsCounter: Counter<string>;

   // Histograms
   private readonly mediaDurationHistogram: Histogram<string>;
   private readonly searchDurationHistogram: Histogram<string>;
   private readonly graphSyncDurationHistogram: Histogram<string>;

   // Gauges
   private readonly totalUsersGauge: Gauge<string>;
   private readonly totalFollowsGauge: Gauge<string>;

   constructor(@Optional() customRegistry?: Registry) {
      this.registry = customRegistry || new Registry();

      // Collect default node runtime metrics under configured prefix
      collectDefaultMetrics({
         register: this.registry,
         prefix: USER_METRICS_PREFIX,
      });

      // Counters
      this.mediaOperationsCounter = new Counter({
         name: USER_METRICS_NAMES.MEDIA_OPERATIONS,
         help: USER_METRICS_HELP.MEDIA_OPERATIONS,
         labelNames: [USER_METRICS_LABELS.OPERATION, USER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.searchOperationsCounter = new Counter({
         name: USER_METRICS_NAMES.SEARCH_OPERATIONS,
         help: USER_METRICS_HELP.SEARCH_OPERATIONS,
         labelNames: [USER_METRICS_LABELS.OPERATION, USER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.notificationOperationsCounter = new Counter({
         name: USER_METRICS_NAMES.NOTIFICATION_OPERATIONS,
         help: USER_METRICS_HELP.NOTIFICATION_OPERATIONS,
         labelNames: [USER_METRICS_LABELS.OPERATION, USER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.domainOperationsCounter = new Counter({
         name: USER_METRICS_NAMES.DOMAIN_OPERATIONS,
         help: USER_METRICS_HELP.DOMAIN_OPERATIONS,
         labelNames: [USER_METRICS_LABELS.OPERATION, USER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.graphSyncOperationsCounter = new Counter({
         name: USER_METRICS_NAMES.GRAPH_SYNC_OPERATIONS,
         help: USER_METRICS_HELP.GRAPH_SYNC_OPERATIONS,
         labelNames: [USER_METRICS_LABELS.OPERATION, USER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      // Histograms
      this.mediaDurationHistogram = new Histogram({
         name: USER_METRICS_NAMES.MEDIA_OPERATION_DURATION,
         help: USER_METRICS_HELP.MEDIA_OPERATION_DURATION,
         buckets: USER_METRICS_BUCKETS.MEDIA_DURATION,
         registers: [this.registry],
      });

      this.searchDurationHistogram = new Histogram({
         name: USER_METRICS_NAMES.SEARCH_OPERATION_DURATION,
         help: USER_METRICS_HELP.SEARCH_OPERATION_DURATION,
         buckets: USER_METRICS_BUCKETS.SEARCH_DURATION,
         registers: [this.registry],
      });

      this.graphSyncDurationHistogram = new Histogram({
         name: USER_METRICS_NAMES.GRAPH_SYNC_DURATION,
         help: USER_METRICS_HELP.GRAPH_SYNC_DURATION,
         buckets: USER_METRICS_BUCKETS.GRAPH_SYNC_DURATION,
         registers: [this.registry],
      });

      // Gauges
      this.totalUsersGauge = new Gauge({
         name: USER_METRICS_NAMES.TOTAL_USERS,
         help: USER_METRICS_HELP.TOTAL_USERS,
         registers: [this.registry],
      });

      this.totalFollowsGauge = new Gauge({
         name: USER_METRICS_NAMES.TOTAL_FOLLOWS,
         help: USER_METRICS_HELP.TOTAL_FOLLOWS,
         registers: [this.registry],
      });
   }

   get contentType(): string {
      return this.registry.contentType;
   }

   async getMetrics(): Promise<string> {
      return this.registry.metrics();
   }

   // Counter methods
   recordMediaOperation(operation: UserMetricMediaOperation, status: UserMetricStatus): void {
      this.mediaOperationsCounter.inc({
         [USER_METRICS_LABELS.OPERATION]: operation,
         [USER_METRICS_LABELS.STATUS]: status,
      });
   }

   recordSearchOperation(operation: UserMetricSearchOperation, status: UserMetricStatus): void {
      this.searchOperationsCounter.inc({
         [USER_METRICS_LABELS.OPERATION]: operation,
         [USER_METRICS_LABELS.STATUS]: status,
      });
   }

   recordNotificationOperation(operation: UserMetricNotificationOperation, status: UserMetricStatus): void {
      this.notificationOperationsCounter.inc({
         [USER_METRICS_LABELS.OPERATION]: operation,
         [USER_METRICS_LABELS.STATUS]: status,
      });
   }

   recordDomainOperation(operation: UserMetricDomainOperation, status: UserMetricStatus): void {
      this.domainOperationsCounter.inc({
         [USER_METRICS_LABELS.OPERATION]: operation,
         [USER_METRICS_LABELS.STATUS]: status,
      });
   }

   recordGraphSyncOperation(operation: UserMetricGraphOperation, status: UserMetricStatus): void {
      this.graphSyncOperationsCounter.inc({
         [USER_METRICS_LABELS.OPERATION]: operation,
         [USER_METRICS_LABELS.STATUS]: status,
      });
   }

   // Histogram methods
   observeMediaDuration(durationSeconds: number): void {
      this.mediaDurationHistogram.observe(durationSeconds);
   }

   observeSearchDuration(durationSeconds: number): void {
      this.searchDurationHistogram.observe(durationSeconds);
   }

   observeGraphSyncDuration(durationSeconds: number): void {
      this.graphSyncDurationHistogram.observe(durationSeconds);
   }

   // Gauge methods
   setTotalUsers(count: number): void {
      this.totalUsersGauge.set(count);
   }

   setTotalFollows(count: number): void {
      this.totalFollowsGauge.set(count);
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
