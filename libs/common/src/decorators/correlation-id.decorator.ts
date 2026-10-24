import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@common/logger/logger.constants';
import { extractGrpcMetadata } from '@common/interceptors/grpc-interceptor.util';
import { GrpcTraceStorage } from '@common/interceptors/grpc-trace.storage';
import { uuidv7 } from '@common/utils/uuid.util';
import type { Request } from 'express';

/**
 * Universal parameter decorator to extract the active correlation ID across HTTP, gRPC, and RPC contexts.
 */
export const CorrelationId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
   if (ctx.getType() === 'http') {
      const request = ctx.switchToHttp().getRequest<Request>();
      return (
         (request?.headers?.[CORRELATION_ID_HEADER] as string) ||
         (request?.headers?.[REQUEST_ID_HEADER] as string) ||
         (request?.id as string) ||
         uuidv7()
      );
   }
   if (ctx.getType() === 'rpc') {
      const alsCorrelationId = GrpcTraceStorage.getCorrelationId();
      if (alsCorrelationId) {
         return alsCorrelationId;
      }
      const { correlationId } = extractGrpcMetadata(ctx);
      return correlationId;
   }
   return GrpcTraceStorage.getCorrelationId() || uuidv7();
});
