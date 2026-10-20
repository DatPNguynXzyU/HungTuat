import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response } from 'express';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@common/logger/logger.constants';
import { TRACING_ATTRIBUTES } from '@common/tracing/tracing.constants';

/**
 * Express request interface enriched with explicit authentication
 * and tracing identifiers (userId, requestId, correlationId).
 */
interface AuthenticatedRequest extends Omit<Request, 'route'> {
   /**
    * Authenticated user session or decoded JWT token payload
    */
   user?: {
      /**
       * Unique user identifier from JWT claims
       */
      userId?: string;
      /**
       * Standard JWT subject identifier claim representing the authenticated user
       */
      sub?: string;
   };
   /**
    * Direct user identifier associated with the request context
    */
   userId?: string;
   /**
    * Unique HTTP request identifier assigned by middleware/gateway
    */
   requestId?: string;
   /**
    * Express route object with path information
    */
   route?: {
      path?: string;
   };
}

/**
 * Interceptor Pattern: TracingInterceptor enriches the active OpenTelemetry span
 * with HTTP/RPC contextual metadata, explicit user ID, request ID, and correlation ID.
 */
@Injectable()
export class TracingInterceptor implements NestInterceptor {
   intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const span = trace.getActiveSpan();
      if (!span) {
         return next.handle();
      }

      const type = context.getType();

      if (type === 'http') {
         const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
         const res = context.switchToHttp().getResponse<Response>();

         const correlationId =
            (req.headers[CORRELATION_ID_HEADER] as string) ||
            (req.headers[REQUEST_ID_HEADER] as string) ||
            req.requestId;
         if (correlationId) {
            span.setAttribute(TRACING_ATTRIBUTES.CORRELATION_ID, correlationId);
         }

         const requestId = (req.headers[REQUEST_ID_HEADER] as string) || req.requestId;
         if (requestId) {
            span.setAttribute(TRACING_ATTRIBUTES.REQUEST_ID, requestId);
         }

         const userId = req.user?.userId || req.user?.sub || req.userId;
         if (userId) {
            span.setAttribute(TRACING_ATTRIBUTES.USER_ID, userId);
         }

         if (req.method) {
            span.setAttribute(TRACING_ATTRIBUTES.HTTP_METHOD, req.method);
         }
         const routePath = req.route?.path;
         if (routePath && typeof routePath === 'string') {
            span.setAttribute(TRACING_ATTRIBUTES.HTTP_ROUTE, routePath);
         }

         return next.handle().pipe(
            tap({
               next: () => {
                  if (res.statusCode) {
                     span.setAttribute(TRACING_ATTRIBUTES.HTTP_STATUS, res.statusCode);
                     if (res.statusCode >= Number(HttpStatus.BAD_REQUEST)) {
                        span.setStatus({ code: SpanStatusCode.ERROR });
                     }
                  }
               },
               error: (err: unknown) => {
                  if (err instanceof Error) {
                     span.recordException(err);
                  }
                  span.setStatus({
                     code: SpanStatusCode.ERROR,
                     message: err instanceof Error ? err.message : String(err),
                  });
               },
            }),
         );
      }

      if (type === 'rpc') {
         const rpcContext = context.switchToRpc();
         const data = rpcContext.getData<Record<string, unknown> | undefined>();

         if (data && typeof data === 'object') {
            if (typeof data.correlationId === 'string') {
               span.setAttribute(TRACING_ATTRIBUTES.CORRELATION_ID, data.correlationId);
            }
            if (typeof data.requestId === 'string') {
               span.setAttribute(TRACING_ATTRIBUTES.REQUEST_ID, data.requestId);
            }
            if (typeof data.userId === 'string') {
               span.setAttribute(TRACING_ATTRIBUTES.USER_ID, data.userId);
            }
         }

         return next.handle().pipe(
            tap({
               error: (err: unknown) => {
                  if (err instanceof Error) {
                     span.recordException(err);
                  }
                  span.setStatus({
                     code: SpanStatusCode.ERROR,
                     message: err instanceof Error ? err.message : String(err),
                  });
               },
            }),
         );
      }

      return next.handle();
   }
}
