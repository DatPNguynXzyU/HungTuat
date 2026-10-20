import { status as GrpcStatus } from '@grpc/grpc-js';
import { HttpStatus } from '@nestjs/common';
import {
   BadRequestException,
   ConflictException,
   ForbiddenException,
   InternalServerException,
   NotFoundException,
   TooManyRequestsException,
   UnauthorizedException,
} from '@common/exceptions/http.exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';

export { GrpcStatus };

export interface IGrpcSerializedError {
   errorCode?: string;
   message?: string;
   statusCode?: HttpStatus;
   params?: Record<string, unknown>;
   correlationId?: string;
}

/**
 * Universal error handler for gRPC client responses across Gateway and Microservices.
 * Maps incoming gRPC exceptions back into appropriate domain AppException subclasses,
 * preserving i18n translation keys (errorCode) and interpolation parameters (params).
 */
export const handleGrpcError = (error: unknown): never => {
   if (typeof error === 'object' && error !== null && 'message' in error) {
      const rawMessage = (error as { message: unknown; code?: number }).message;
      const grpcCode = (error as { code?: number }).code;

      if (typeof rawMessage === 'string') {
         try {
            const parsed = JSON.parse(rawMessage) as IGrpcSerializedError;
            const errorCode = parsed.errorCode || COMMON_ERROR_CODES.INVALID_REQUEST;
            const params = parsed.params;
            const statusCode = parsed.statusCode;

            if (statusCode) {
               switch (statusCode) {
                  case HttpStatus.BAD_REQUEST:
                  case HttpStatus.UNPROCESSABLE_ENTITY:
                     throw new BadRequestException(errorCode, { params });
                  case HttpStatus.UNAUTHORIZED:
                     throw new UnauthorizedException(errorCode, { params });
                  case HttpStatus.FORBIDDEN:
                     throw new ForbiddenException(errorCode, { params });
                  case HttpStatus.NOT_FOUND:
                     throw new NotFoundException(errorCode, { params });
                  case HttpStatus.CONFLICT:
                     throw new ConflictException(errorCode, { params });
                  case HttpStatus.TOO_MANY_REQUESTS:
                     throw new TooManyRequestsException(errorCode, { params });
                  default:
                     throw new InternalServerException(errorCode, { params });
               }
            }

            // Fallback mapping by gRPC status code constant
            switch (grpcCode) {
               case GrpcStatus.INVALID_ARGUMENT:
                  throw new BadRequestException(errorCode, { params });
               case GrpcStatus.NOT_FOUND:
                  throw new NotFoundException(errorCode, { params });
               case GrpcStatus.ALREADY_EXISTS:
                  throw new ConflictException(errorCode, { params });
               case GrpcStatus.PERMISSION_DENIED:
                  throw new ForbiddenException(errorCode, { params });
               case GrpcStatus.RESOURCE_EXHAUSTED:
                  throw new TooManyRequestsException(errorCode, { params });
               case GrpcStatus.UNAUTHENTICATED:
                  throw new UnauthorizedException(errorCode, { params });
               default:
                  throw new BadRequestException(errorCode, { params });
            }
         } catch (e) {
            if (e instanceof Error && e.name.endsWith('Exception')) {
               throw e;
            }
         }
      }
   }

   throw error;
};
