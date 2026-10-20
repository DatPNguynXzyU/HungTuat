import { status as GrpcStatus } from '@grpc/grpc-js';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { GRPC_METRICS_COLLECTOR, type IGrpcMetricsCollector } from '@common/interceptors/grpc-metrics.interface';
import { getGrpcStatusFromError } from '@common/interceptors/grpc-interceptor.util';

/**
 * AOP Interceptor for observability and monitoring of incoming gRPC calls.
 * Records call throughput and duration histograms via IGrpcMetricsCollector.
 */
@Injectable()
export class GrpcMetricsInterceptor implements NestInterceptor {
   constructor(
      @Optional()
      @Inject(GRPC_METRICS_COLLECTOR)
      private readonly metricsCollector?: IGrpcMetricsCollector,
   ) {}

   intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      if (context.getType() !== 'rpc' || !this.metricsCollector) {
         return next.handle();
      }

      const handlerName = context.getHandler().name;
      const className = context.getClass().name;
      const startTime = Date.now();

      return next.handle().pipe(
         tap({
            next: () => {
               const durationSeconds = Math.max(0, (Date.now() - startTime) / 1000);
               const okStatus = (GrpcStatus[GrpcStatus.OK] as string | undefined) || 'OK';
               this.metricsCollector?.recordGrpcCall({
                  service: className,
                  method: handlerName,
                  status: okStatus,
                  durationSeconds,
               });
            },
         }),
         catchError((error: unknown) => {
            const durationSeconds = Math.max(0, (Date.now() - startTime) / 1000);
            const { statusName } = getGrpcStatusFromError(error);

            this.metricsCollector?.recordGrpcCall({
               service: className,
               method: handlerName,
               status: statusName,
               durationSeconds,
            });

            return throwError(() => error);
         }),
      );
   }
}
