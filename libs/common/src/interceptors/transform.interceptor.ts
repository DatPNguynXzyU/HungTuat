import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '@common/decorators/response-message.decorator';
import type { IBaseResponse, IPaginationMeta, ICursorPaginationMeta } from '@common/interfaces/response.interface';
import { CORRELATION_ID_HEADER, LOG_ACTION_KEY, REQUEST_ID_HEADER } from '@common/logger/logger.constants';

interface LoggableRequest extends Request {
   action?: string;
   customLogMessage?: string;
   userId?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, IBaseResponse<T>> {
   constructor(private readonly reflector: Reflector) {}

   intercept(context: ExecutionContext, next: CallHandler): Observable<IBaseResponse<T>> {
      const httpCtx = context.switchToHttp();
      const response = httpCtx.getResponse<Response>();
      const request = httpCtx.getRequest<LoggableRequest>();
      const statusCode = response.statusCode;
      const message = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler()) || 'SUCCESS';
      const action = this.reflector.get<string>(LOG_ACTION_KEY, context.getHandler());

      if (request) {
         if (action) {
            request.action = action;
         } else if (message && message !== 'SUCCESS' && !request.action) {
            request.action = message;
         }

         if (message && message !== 'SUCCESS') {
            request.customLogMessage = message;
         }
      }

      const correlationId =
         (request?.headers?.[CORRELATION_ID_HEADER] as string) ||
         (request?.headers?.[REQUEST_ID_HEADER] as string) ||
         (request?.id as string);

      return next.handle().pipe(
         map((data: T) => {
            let responseData: T | null = data;
            let meta: IPaginationMeta | ICursorPaginationMeta | undefined = undefined;

            if (data && typeof data === 'object' && 'items' in data && 'meta' in data) {
               const paginated = data as { items: unknown; meta: IPaginationMeta | ICursorPaginationMeta };
               responseData = paginated.items as T;
               meta = paginated.meta;
            }

            if (request && data && typeof data === 'object') {
               const dataObj = data as Record<string, unknown>;
               if (dataObj.user && typeof dataObj.user === 'object') {
                  const userObj = dataObj.user as Record<string, unknown>;
                  if (typeof userObj.id === 'string') {
                     request.userId = userObj.id;
                  }
               }
            }

            return {
               success: true,
               statusCode,
               message,
               data: responseData ?? null,
               ...(meta ? { meta } : {}),
               timestamp: new Date().toISOString(),
               ...(correlationId ? { correlationId } : {}),
            };
         }),
      );
   }
}
