import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Metadata } from '@grpc/grpc-js';
import { CORRELATION_ID_HEADER } from '@common/logger/logger.constants';
import {
   extractGrpcMetadata,
   getGrpcStatusFromError,
   sanitizeGrpcPayload,
} from '@common/interceptors/grpc-interceptor.util';
import { GrpcTraceStorage } from '@common/interceptors/grpc-trace.storage';

/**
 * AOP Interceptor for structured logging and distributed tracing of incoming gRPC calls.
 * Extracts correlation ID and caller metadata, initializes AsyncLocalStorage trace context,
 * sanitizes payloads, and records call latency and execution status.
 */
@Injectable()
export class GrpcLoggingInterceptor implements NestInterceptor {
   private readonly logger = new Logger(GrpcLoggingInterceptor.name);

   intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      if (context.getType() !== 'rpc') {
         return next.handle();
      }

      const traceContext = extractGrpcMetadata(context);
      const { correlationId, callerService } = traceContext;
      const data = context.switchToRpc().getData<unknown>();
      const handlerName = context.getHandler().name;
      const className = context.getClass().name;
      const target = `${className}#${handlerName}`;
      const startTime = Date.now();

      // Attempt to attach correlation ID to initial response metadata if gRPC call object is accessible
      const args = typeof context.getArgs === 'function' ? context.getArgs() : undefined;
      const call =
         args && args.length > 2
            ? (args[2] as { sendMetadata?: (m: Metadata) => void; metadataSent?: boolean })
            : undefined;
      if (call && typeof call.sendMetadata === 'function' && !call.metadataSent) {
         const responseMetadata = new Metadata();
         responseMetadata.set(CORRELATION_ID_HEADER, correlationId);
         try {
            call.sendMetadata(responseMetadata);
         } catch {
            // Silently ignore if headers were already committed by transport
         }
      }

      this.logger.log({
         message: `[gRPC Request] [${correlationId}] ${target}`,
         correlationId,
         ...(callerService ? { callerService } : {}),
         target,
         data: sanitizeGrpcPayload(data),
      });

      return new Observable((subscriber) => {
         GrpcTraceStorage.run(traceContext, () => {
            const subscription = next
               .handle()
               .pipe(
                  tap({
                     next: () => {
                        const durationMs = Date.now() - startTime;
                        this.logger.log({
                           message: `[gRPC Response] [${correlationId}] ${target} - OK (${durationMs}ms)`,
                           correlationId,
                           ...(callerService ? { callerService } : {}),
                           target,
                           durationMs,
                           status: 'OK',
                        });
                     },
                  }),
                  catchError((error: unknown) => {
                     const durationMs = Date.now() - startTime;
                     const { statusName } = getGrpcStatusFromError(error);
                     const errorMessage = error instanceof Error ? error.message : String(error);
                     const stack = error instanceof Error ? error.stack : undefined;

                     this.logger.error({
                        message: `[gRPC Error] [${correlationId}] ${target} - ${statusName} (${durationMs}ms): ${errorMessage}`,
                        correlationId,
                        ...(callerService ? { callerService } : {}),
                        target,
                        durationMs,
                        status: statusName,
                        error: errorMessage,
                        stack,
                     });

                     return throwError(() => error);
                  }),
               )
               .subscribe(subscriber);

            return () => subscription.unsubscribe();
         });
      });
   }
}
