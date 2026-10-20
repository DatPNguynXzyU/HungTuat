import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ServingStatus } from '@contracts/health';
import type { IHealthCheckResponse } from '@contracts/health';
import {
   GRPC_HEALTH_INDICATORS,
   HealthIndicatorStatus,
   type HealthIndicatorResult,
   type IHealthIndicator,
} from '@common/grpc-health/interfaces/health-indicator.interface';
import { Observable, Subject } from 'rxjs';

export interface ServiceStatusChangeEvent {
   service: string;
   status: ServingStatus;
}

/**
 * Service aggregating health check indicators (Composite Pattern)
 * and broadcasting health transitions (Observer Pattern).
 */
@Injectable()
export class GrpcHealthService {
   private readonly logger = new Logger(GrpcHealthService.name);
   private readonly serviceStatuses = new Map<string, ServingStatus>();
   private readonly statusUpdates$ = new Subject<ServiceStatusChangeEvent>();
   private readonly indicators: IHealthIndicator[];

   constructor(
      @Optional()
      @Inject(GRPC_HEALTH_INDICATORS)
      indicators?: IHealthIndicator[],
   ) {
      this.indicators = indicators || [];
      // Initialize overall server health as SERVING by default
      this.serviceStatuses.set('', ServingStatus.SERVING);
   }

   /**
    * Registers an additional health indicator dynamically.
    */
   addIndicator(indicator: IHealthIndicator): void {
      this.indicators.push(indicator);
   }

   /**
    * Sets or updates the serving status for a specific service or overall server ("").
    * Notifies all active Watch observers.
    */
   setStatus(service: string, status: ServingStatus): void {
      const normalizedService = service || '';
      const previous = this.serviceStatuses.get(normalizedService);
      this.serviceStatuses.set(normalizedService, status);

      if (previous !== status) {
         this.logger.log(
            `gRPC Health status for '${normalizedService || '<root>'}' transitioned: ${previous} -> ${status}`,
         );
         this.statusUpdates$.next({ service: normalizedService, status });
      }
   }

   /**
    * Checks the health of the given service or the overall server.
    * Executes all registered indicators concurrently.
    */
   async check(service: string = ''): Promise<IHealthCheckResponse> {
      const normalizedService = service || '';
      const explicitStatus = this.serviceStatuses.get(normalizedService);

      // If explicitly marked as NOT_SERVING, return immediately
      if (explicitStatus === ServingStatus.NOT_SERVING) {
         return { status: ServingStatus.NOT_SERVING };
      }

      // If no indicators registered, return current explicit status or SERVING
      if (this.indicators.length === 0) {
         return { status: explicitStatus ?? ServingStatus.SERVING };
      }

      // Execute all indicators concurrently
      const results = await Promise.allSettled(this.indicators.map((indicator) => indicator.check()));

      let allHealthy = true;
      const indicatorDetails: Record<string, HealthIndicatorResult> = {};

      for (let i = 0; i < results.length; i++) {
         const indicator = this.indicators[i];
         const res = results[i];

         if (res.status === 'fulfilled') {
            indicatorDetails[indicator.name] = res.value;
            if (res.value.status !== HealthIndicatorStatus.UP) {
               allHealthy = false;
            }
         } else {
            allHealthy = false;
            indicatorDetails[indicator.name] = {
               name: indicator.name,
               status: HealthIndicatorStatus.DOWN,
               error: res.reason instanceof Error ? res.reason.message : String(res.reason),
            };
         }
      }

      if (!allHealthy) {
         this.logger.warn(
            `Health check failed for '${normalizedService || '<root>'}': ${JSON.stringify(indicatorDetails)}`,
         );
         return { status: ServingStatus.NOT_SERVING };
      }

      return { status: ServingStatus.SERVING };
   }

   /**
    * Observes health status stream for a service (Observer Pattern).
    * Emits current state immediately upon subscription, followed by real-time status updates.
    */
   watch(service: string = ''): Observable<IHealthCheckResponse> {
      const normalizedService = service || '';

      return new Observable<IHealthCheckResponse>((subscriber) => {
         // Emit current status asynchronously on subscription
         void this.check(normalizedService).then((initialResponse) => {
            if (!subscriber.closed) {
               subscriber.next(initialResponse);
            }
         });

         const subscription = this.statusUpdates$.subscribe({
            next: (event) => {
               if (event.service === normalizedService || normalizedService === '') {
                  subscriber.next({ status: event.status });
               }
            },
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
         });

         return () => {
            subscription.unsubscribe();
         };
      });
   }
}
