import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { extractGrpcMetadata } from '@common/interceptors/grpc-interceptor.util';
import type { IGrpcTraceContext } from '@common/interceptors/grpc-trace.storage';

/**
 * Parameter decorator to extract gRPC trace context (correlationId, callerService, metadata)
 * directly in gRPC controller handler methods.
 */
export const GrpcTrace = createParamDecorator((_data: unknown, ctx: ExecutionContext): IGrpcTraceContext => {
   return extractGrpcMetadata(ctx);
});
