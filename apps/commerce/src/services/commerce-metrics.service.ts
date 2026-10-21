import { Injectable, Optional } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { IGrpcMetricsCollector } from '@common';
import {
   COMMERCE_METRICS_BUCKETS,
   COMMERCE_METRICS_HELP,
   COMMERCE_METRICS_LABELS,
   COMMERCE_METRICS_NAMES,
   COMMERCE_METRICS_PREFIX,
   type CommerceMetricOperation,
   type CommerceMetricStatus,
} from '@contracts/commerce';

export const COMMERCE_METRICS_SERVICE = Symbol('COMMERCE_METRICS_SERVICE');

@Injectable()
export class CommerceMetricsService implements IGrpcMetricsCollector {
   private readonly registry: Registry;
   private readonly grpcRequestsCounter: Counter<string>;
   private readonly grpcDurationHistogram: Histogram<string>;
   private readonly operationsCounter: Counter<string>;

   constructor(@Optional() customRegistry?: Registry) {
      this.registry = customRegistry || new Registry();

      collectDefaultMetrics({
         register: this.registry,
         prefix: COMMERCE_METRICS_PREFIX,
      });

      this.grpcRequestsCounter = new Counter({
         name: COMMERCE_METRICS_NAMES.GRPC_REQUESTS,
         help: COMMERCE_METRICS_HELP.GRPC_REQUESTS,
         labelNames: [COMMERCE_METRICS_LABELS.SERVICE, COMMERCE_METRICS_LABELS.METHOD, COMMERCE_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.grpcDurationHistogram = new Histogram({
         name: COMMERCE_METRICS_NAMES.GRPC_REQUEST_DURATION,
         help: COMMERCE_METRICS_HELP.GRPC_REQUEST_DURATION,
         labelNames: [COMMERCE_METRICS_LABELS.SERVICE, COMMERCE_METRICS_LABELS.METHOD, COMMERCE_METRICS_LABELS.STATUS],
         buckets: [...COMMERCE_METRICS_BUCKETS.GRPC_REQUEST_DURATION],
         registers: [this.registry],
      });

      this.operationsCounter = new Counter({
         name: COMMERCE_METRICS_NAMES.OPERATIONS,
         help: COMMERCE_METRICS_HELP.OPERATIONS,
         labelNames: [COMMERCE_METRICS_LABELS.OPERATION, COMMERCE_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });
   }

   recordGrpcCall(params: { service: string; method: string; status: string; durationSeconds: number }): void {
      this.grpcRequestsCounter.inc({
         service: params.service,
         method: params.method,
         status: params.status,
      });
      this.grpcDurationHistogram.observe(
         {
            service: params.service,
            method: params.method,
            status: params.status,
         },
         params.durationSeconds,
      );
   }

   recordOperation(operation: CommerceMetricOperation, status: CommerceMetricStatus): void {
      this.operationsCounter.inc({ operation, status });
   }

   async getMetrics(): Promise<string> {
      return this.registry.metrics();
   }

   getContentType(): string {
      return this.registry.contentType;
   }
}
