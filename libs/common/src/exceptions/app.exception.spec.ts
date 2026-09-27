import { HttpStatus } from '@nestjs/common';
import {
   AppException,
   BadRequestException,
   ConflictException,
   ForbiddenException,
   InternalServerException,
   NotFoundException,
   ServiceUnavailableException,
   TimeoutException,
   UnauthorizedException,
   ValidationException,
} from '@common/exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';

describe('Custom Exceptions', () => {
   describe('AppException', () => {
      it('should create an exception with error code string', () => {
         const error = new AppException('CUSTOM.ERROR_CODE', HttpStatus.BAD_REQUEST);
         expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
         expect(error.errorCode).toBe('CUSTOM.ERROR_CODE');
         expect(error.getPayload()).toEqual({
            statusCode: 400,
            errorCode: 'CUSTOM.ERROR_CODE',
            message: 'CUSTOM.ERROR_CODE',
         });
      });

      it('should create an exception with detailed options', () => {
         const error = new AppException({
            errorCode: 'AUTH.USER_NOT_FOUND',
            statusCode: HttpStatus.NOT_FOUND,
            params: { userId: '123' },
            details: { field: 'userId' },
         });
         expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
         expect(error.errorCode).toBe('AUTH.USER_NOT_FOUND');
         expect(error.params).toEqual({ userId: '123' });
         expect(error.details).toEqual({ field: 'userId' });
         expect(error.getPayload()).toEqual({
            statusCode: 404,
            errorCode: 'AUTH.USER_NOT_FOUND',
            message: 'AUTH.USER_NOT_FOUND',
            params: { userId: '123' },
            details: { field: 'userId' },
         });
      });
   });

   describe('HTTP Exception Subclasses', () => {
      it('BadRequestException defaults to 400 and COMMON.INVALID_REQUEST', () => {
         const error = new BadRequestException();
         expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
         expect(error.errorCode).toBe(COMMON_ERROR_CODES.INVALID_REQUEST);
      });

      it('BadRequestException supports custom error code and params', () => {
         const error = new BadRequestException('AUTH.EMAIL_ALREADY_EXISTS', {
            params: { email: 'test@example.com' },
         });
         expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
         expect(error.errorCode).toBe('AUTH.EMAIL_ALREADY_EXISTS');
         expect(error.params).toEqual({ email: 'test@example.com' });
      });

      it('UnauthorizedException defaults to 401', () => {
         const error = new UnauthorizedException('AUTH.INVALID_CREDENTIALS');
         expect(error.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
         expect(error.errorCode).toBe('AUTH.INVALID_CREDENTIALS');
      });

      it('ForbiddenException defaults to 403', () => {
         const error = new ForbiddenException('AUTH.FORBIDDEN');
         expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
         expect(error.errorCode).toBe('AUTH.FORBIDDEN');
      });

      it('NotFoundException defaults to 404', () => {
         const error = new NotFoundException('AUTH.USER_NOT_FOUND');
         expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
         expect(error.errorCode).toBe('AUTH.USER_NOT_FOUND');
      });

      it('ConflictException defaults to 409', () => {
         const error = new ConflictException('AUTH.EMAIL_CONFLICT');
         expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
         expect(error.errorCode).toBe('AUTH.EMAIL_CONFLICT');
      });

      it('ValidationException defaults to 422', () => {
         const error = new ValidationException({
            errorCode: COMMON_ERROR_CODES.VALIDATION_FAILED,
            errors: [{ field: 'email', message: 'email must be valid' }],
         });
         expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
         expect(error.errorCode).toBe(COMMON_ERROR_CODES.VALIDATION_FAILED);
         expect(error.validationErrors).toEqual([{ field: 'email', message: 'email must be valid' }]);
      });

      it('TimeoutException defaults to 408', () => {
         const error = new TimeoutException();
         expect(error.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
         expect(error.errorCode).toBe(COMMON_ERROR_CODES.TIMEOUT);
      });

      it('InternalServerException defaults to 500', () => {
         const error = new InternalServerException();
         expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
         expect(error.errorCode).toBe(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
      });

      it('ServiceUnavailableException defaults to 503', () => {
         const error = new ServiceUnavailableException();
         expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
         expect(error.errorCode).toBe(COMMON_ERROR_CODES.SERVICE_UNAVAILABLE);
      });
   });
});
