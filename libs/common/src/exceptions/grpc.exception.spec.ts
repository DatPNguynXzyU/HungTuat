import { HttpStatus } from '@nestjs/common';
import {
   BadRequestException,
   ConflictException,
   ForbiddenException,
   NotFoundException,
   ServiceUnavailableException,
   TimeoutException,
   TooManyRequestsException,
   UnauthorizedException,
} from '@common/exceptions/http.exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { GrpcStatus, handleGrpcError } from '@common/exceptions/grpc.exception';

const TEST_PARAMS = {
   REASON: 'TEST_REASON',
   EMAIL: 'test@example.com',
} as const;

describe('handleGrpcError', () => {
   it('should parse JSON message and throw BadRequestException with params', () => {
      const error = {
         code: GrpcStatus.INVALID_ARGUMENT,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.INVALID_REQUEST,
            params: { reason: TEST_PARAMS.REASON },
            statusCode: HttpStatus.BAD_REQUEST,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(BadRequestException);
      try {
         handleGrpcError(error);
      } catch (e) {
         expect(e).toBeInstanceOf(BadRequestException);
         const badRequest = e as BadRequestException;
         expect(badRequest.getPayload().errorCode).toBe(COMMON_ERROR_CODES.INVALID_REQUEST);
         expect(badRequest.getPayload().params).toEqual({ reason: TEST_PARAMS.REASON });
      }
   });

   it('should map statusCode to ConflictException when conflict code is present', () => {
      const error = {
         code: GrpcStatus.ALREADY_EXISTS,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.CONFLICT,
            params: { email: TEST_PARAMS.EMAIL },
            statusCode: HttpStatus.CONFLICT,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(ConflictException);
   });

   it('should map fallback gRPC status code RESOURCE_EXHAUSTED to TooManyRequestsException', () => {
      const error = {
         code: GrpcStatus.RESOURCE_EXHAUSTED,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.TOO_MANY_REQUESTS,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(TooManyRequestsException);
   });

   it('should map fallback gRPC status code NOT_FOUND to NotFoundException', () => {
      const error = {
         code: GrpcStatus.NOT_FOUND,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.RESOURCE_NOT_FOUND,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(NotFoundException);
   });

   it('should map fallback gRPC status code PERMISSION_DENIED to ForbiddenException', () => {
      const error = {
         code: GrpcStatus.PERMISSION_DENIED,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.FORBIDDEN,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(ForbiddenException);
   });

   it('should map fallback gRPC status code UNAUTHENTICATED to UnauthorizedException', () => {
      const error = {
         code: GrpcStatus.UNAUTHENTICATED,
         message: JSON.stringify({
            errorCode: COMMON_ERROR_CODES.UNAUTHORIZED,
         }),
      };

      expect(() => handleGrpcError(error)).toThrow(UnauthorizedException);
   });

   it('should rethrow existing AppException instances directly without mutation', () => {
      const appEx = new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST);
      expect(() => handleGrpcError(appEx)).toThrow(appEx);
   });

   it('should map fallback gRPC status code UNAVAILABLE to ServiceUnavailableException', () => {
      const error = {
         code: GrpcStatus.UNAVAILABLE,
         message: '14 UNAVAILABLE: connection refused',
      };

      expect(() => handleGrpcError(error)).toThrow(ServiceUnavailableException);
   });

   it('should map fallback gRPC status code DEADLINE_EXCEEDED to TimeoutException', () => {
      const error = {
         code: GrpcStatus.DEADLINE_EXCEEDED,
         message: '4 DEADLINE_EXCEEDED: deadline exceeded after 3000ms',
      };

      expect(() => handleGrpcError(error)).toThrow(TimeoutException);
   });

   it('should parse real gRPC error with status prefix and throw UnauthorizedException', () => {
      const error = {
         code: GrpcStatus.UNKNOWN,
         message:
            '2 UNKNOWN: {"errorCode":"COMMON.UNAUTHORIZED","message":"COMMON.UNAUTHORIZED","params":{"reason":"token_invalid_or_expired"},"correlationId":"corr-123"}',
      };

      expect(() => handleGrpcError(error)).toThrow(UnauthorizedException);
      try {
         handleGrpcError(error);
      } catch (e) {
         expect(e).toBeInstanceOf(UnauthorizedException);
         const unauth = e as UnauthorizedException;
         expect(unauth.getPayload().errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect(unauth.getPayload().params).toEqual({ reason: 'token_invalid_or_expired' });
      }
   });

   it('should parse real gRPC error with details property and statusCode', () => {
      const error = {
         code: GrpcStatus.UNAUTHENTICATED,
         details:
            '{"statusCode":401,"errorCode":"COMMON.UNAUTHORIZED","message":"COMMON.UNAUTHORIZED","params":{"reason":"token_invalid_or_expired"}}',
         message:
            '16 UNAUTHENTICATED: {"statusCode":401,"errorCode":"COMMON.UNAUTHORIZED","message":"COMMON.UNAUTHORIZED"}',
      };

      expect(() => handleGrpcError(error)).toThrow(UnauthorizedException);
   });

   it('should parse gRPC error with AUTH.REFRESH_TOKEN_INVALID and map to UnauthorizedException', () => {
      const error = {
         code: GrpcStatus.UNAUTHENTICATED,
         message:
            '16 UNAUTHENTICATED: {"statusCode":401,"errorCode":"AUTH.REFRESH_TOKEN_INVALID","message":"AUTH.REFRESH_TOKEN_INVALID","correlationId":"corr-456"}',
      };

      expect(() => handleGrpcError(error)).toThrow(UnauthorizedException);
   });

   it('should rethrow non-grpc or unparsable errors', () => {
      const error = new Error('Raw unhandled error');
      expect(() => handleGrpcError(error)).toThrow('Raw unhandled error');
   });
});
