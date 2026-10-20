import { ArgumentsHost, Catch, HttpStatus, Logger, type RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, throwError } from 'rxjs';
import { AppException, COMMON_ERROR_CODES } from '@common';
import { extractGrpcMetadata, mapHttpStatusToGrpc } from '@common/interceptors/grpc-interceptor.util';
import { GrpcTraceStorage } from '@common/interceptors/grpc-trace.storage';
import { randomUUID } from 'crypto';

/**
 * Universal Filter for catching and mapping domain & application exceptions into standard gRPC status codes.
 * Ensures metadata, tracing correlation ID, and i18n error codes are preserved for gRPC clients.
 */
@Catch()
export class GrpcExceptionFilter implements RpcExceptionFilter {
   private readonly logger = new Logger(GrpcExceptionFilter.name);

   catch(exception: unknown, host?: ArgumentsHost): Observable<never> {
      let code: number = GrpcStatus.INTERNAL;
      let errorCode: string = COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message: string = COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
      let params: Record<string, unknown> | undefined = undefined;

      // Extract correlation ID from AsyncLocalStorage or host context
      let correlationId = GrpcTraceStorage.getCorrelationId();
      if (!correlationId && host) {
         try {
            const extracted = extractGrpcMetadata(host);
            correlationId = extracted.correlationId;
         } catch {
            // Ignore if context extraction is unavailable
         }
      }
      if (!correlationId) {
         correlationId = randomUUID();
      }

      if (exception instanceof AppException) {
         const payload = exception.getPayload();
         code = this.mapHttpStatusToGrpc(payload.statusCode);
         errorCode = payload.errorCode;
         message = payload.message || payload.errorCode;
         params = payload.params;
      } else if (exception instanceof RpcException) {
         const error = exception.getError();
         if (typeof error === 'object' && error !== null) {
            const errObj = error as Record<string, unknown>;
            if (typeof errObj.code === 'number') {
               code = errObj.code;
            }
            if (typeof errObj.errorCode === 'string') {
               errorCode = errObj.errorCode;
            }
            if (typeof errObj.message === 'string') {
               message = errObj.message;
            }
            if (typeof errObj.params === 'object' && errObj.params !== null) {
               params = errObj.params as Record<string, unknown>;
            }
            if (typeof errObj.correlationId === 'string') {
               correlationId = errObj.correlationId;
            }
         } else if (typeof error === 'string') {
            message = error;
            errorCode = error;
         }
      } else if (exception instanceof Error) {
         message = exception.message;
      }

      this.logger.warn(`gRPC Exception: [${correlationId}] [code=${code}] ${errorCode}`);

      return throwError(
         () =>
            new RpcException({
               code,
               message: JSON.stringify({
                  errorCode,
                  message,
                  params,
                  correlationId,
               }),
            }),
      );
   }

   protected mapHttpStatusToGrpc(httpStatus: HttpStatus): number {
      return mapHttpStatusToGrpc(httpStatus);
   }
}
