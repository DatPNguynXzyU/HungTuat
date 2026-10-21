import { Injectable, Optional } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { IGrpcMetricsCollector } from '@common';
import {
   SUPPLIER_METRICS_BUCKETS,
   SUPPLIER_METRICS_HELP,
   SUPPLIER_METRICS_LABELS,
   SUPPLIER_METRICS_NAMES,
   SUPPLIER_METRICS_PREFIX,
   type SupplierMetricOperation,
   type SupplierMetricStatus,
} from '@contracts/supplier';

export const SUPPLIER_METRICS_SERVICE = Symbol('SUPPLIER_METRICS_SERVICE');

@Injectable()
export class SupplierMetricsService implements IGrpcMetricsCollector {
   private readonly registry: Registry;
   private readonly grpcRequestsCounter: Counter<string>;
   private readonly grpcDurationHistogram: Histogram<string>;
   private readonly operationsCounter: Counter<string>;

   constructor(@Optional() customRegistry?: Registry) {
      this.registry = customRegistry || new Registry();

      collectDefaultMetrics({
         register: this.registry,
         prefix: SUPPLIER_METRICS_PREFIX,
      });

      this.grpcRequestsCounter = new Counter({
         name: SUPPLIER_METRICS_NAMES.GRPC_REQUESTS,
         help: SUPPLIER_METRICS_HELP.GRPC_REQUESTS,
         labelNames: [SUPPLIER_METRICS_LABELS.SERVICE, SUPPLIER_METRICS_LABELS.METHOD, SUPPLIER_METRICS_LABELS.STATUS],
         registers: [this.registry],
      });

      this.grpcDurationHistogram = new Histogram({
         name: SUPPLIER_METRICS_NAMES.GRPC_REQUEST_DURATION,
         help: SUPPLIER_METRICS_HELP.GRPC_REQUEST_DURATION,
         labelNames: [SUPPLIER_METRICS_LABELS.SERVICE, SUPPLIER_METRICS_LABELS.METHOD, SUPPLIER_METRICS_LABELS.STATUS],
         buckets: [...SUPPLIER_METRICS_BUCKETS.GRPC_REQUEST_DURATION],
         registers: [this.registry],
      });

      this.operationsCounter = new Counter({
         name: SUPPLIER_METRICS_NAMES.OPERATIONS,
         help: SUPPLIER_METRICS_HELP.OPERATIONS,
         labelNames: [SUPPLIER_METRICS_LABELS.OPERATION, SUPPLIER_METRICS_LABELS.STATUS],
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

   recordOperation(operation: SupplierMetricOperation, status: SupplierMetricStatus): void {
      this.operationsCounter.inc({ operation, status });
   }

   async getMetrics(): Promise<string> {
      return this.registry.metrics();
   }

   getContentType(): string {
      return this.registry.contentType;
   }
}
