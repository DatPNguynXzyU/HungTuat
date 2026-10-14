import { HttpStatus } from '@nestjs/common';
import { AppException } from '@common/exceptions/app.exception';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { AppExceptionInput, IAppExceptionOptions } from '@common/exceptions/exception.types';

export class BadRequestException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.INVALID_REQUEST,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.BAD_REQUEST },
            HttpStatus.BAD_REQUEST,
         );
      } else {
         super({ statusCode: HttpStatus.BAD_REQUEST, ...errorCodeOrOptions }, HttpStatus.BAD_REQUEST);
      }
   }
}

export class UnauthorizedException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.UNAUTHORIZED,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.UNAUTHORIZED },
            HttpStatus.UNAUTHORIZED,
         );
      } else {
         super({ statusCode: HttpStatus.UNAUTHORIZED, ...errorCodeOrOptions }, HttpStatus.UNAUTHORIZED);
      }
   }
}

export class ForbiddenException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.FORBIDDEN,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super({ errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);
      } else {
         super({ statusCode: HttpStatus.FORBIDDEN, ...errorCodeOrOptions }, HttpStatus.FORBIDDEN);
      }
   }
}

export class NotFoundException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.RESOURCE_NOT_FOUND,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super({ errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      } else {
         super({ statusCode: HttpStatus.NOT_FOUND, ...errorCodeOrOptions }, HttpStatus.NOT_FOUND);
      }
   }
}

export class ConflictException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.CONFLICT,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super({ errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.CONFLICT }, HttpStatus.CONFLICT);
      } else {
         super({ statusCode: HttpStatus.CONFLICT, ...errorCodeOrOptions }, HttpStatus.CONFLICT);
      }
   }
}

export class ValidationException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.VALIDATION_FAILED,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.UNPROCESSABLE_ENTITY },
            HttpStatus.UNPROCESSABLE_ENTITY,
         );
      } else {
         super({ statusCode: HttpStatus.UNPROCESSABLE_ENTITY, ...errorCodeOrOptions }, HttpStatus.UNPROCESSABLE_ENTITY);
      }
   }
}

export class TimeoutException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.TIMEOUT,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.REQUEST_TIMEOUT },
            HttpStatus.REQUEST_TIMEOUT,
         );
      } else {
         super({ statusCode: HttpStatus.REQUEST_TIMEOUT, ...errorCodeOrOptions }, HttpStatus.REQUEST_TIMEOUT);
      }
   }
}

export class InternalServerException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
            HttpStatus.INTERNAL_SERVER_ERROR,
         );
      } else {
         super(
            { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, ...errorCodeOrOptions },
            HttpStatus.INTERNAL_SERVER_ERROR,
         );
      }
   }
}

export class ServiceUnavailableException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.SERVICE_UNAVAILABLE,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.SERVICE_UNAVAILABLE },
            HttpStatus.SERVICE_UNAVAILABLE,
         );
      } else {
         super({ statusCode: HttpStatus.SERVICE_UNAVAILABLE, ...errorCodeOrOptions }, HttpStatus.SERVICE_UNAVAILABLE);
      }
   }
}

export class TooManyRequestsException extends AppException {
   constructor(
      errorCodeOrOptions: AppExceptionInput = COMMON_ERROR_CODES.TOO_MANY_REQUESTS,
      options?: Omit<IAppExceptionOptions, 'errorCode' | 'statusCode'>,
   ) {
      if (typeof errorCodeOrOptions === 'string') {
         super(
            { errorCode: errorCodeOrOptions, ...options, statusCode: HttpStatus.TOO_MANY_REQUESTS },
            HttpStatus.TOO_MANY_REQUESTS,
         );
      } else {
         super({ statusCode: HttpStatus.TOO_MANY_REQUESTS, ...errorCodeOrOptions }, HttpStatus.TOO_MANY_REQUESTS);
      }
   }
}

// Aliases for explicit clarity when needed
export {
   BadRequestException as BadRequestAppException,
   UnauthorizedException as UnauthorizedAppException,
   ForbiddenException as ForbiddenAppException,
   NotFoundException as NotFoundAppException,
   ConflictException as ConflictAppException,
   ValidationException as ValidationAppException,
   TimeoutException as TimeoutAppException,
   InternalServerException as InternalServerAppException,
   ServiceUnavailableException as ServiceUnavailableAppException,
   TooManyRequestsException as TooManyRequestsAppException,
};
