import { Catch, HttpException, HttpStatus, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { AppException } from '@common/exceptions/app.exception';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { IAppExceptionPayload } from '@common/exceptions/exception.types';
import { IValidationErrorDetail } from '@common/interfaces/response.interface';

@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter {
   private readonly logger = new Logger(AllRpcExceptionsFilter.name);

   catch(exception: unknown): Observable<never> {
      let payload: IAppExceptionPayload;

      if (exception instanceof AppException) {
         payload = exception.getPayload();
      } else if (exception instanceof HttpException) {
         const res = exception.getResponse();
         const status = exception.getStatus();

         if (typeof res === 'object' && res !== null) {
            const resObj = res as Record<string, unknown>;
            const errorCode =
               (resObj.errorCode as string) ||
               (typeof resObj.message === 'string' && resObj.message !== '[object Object]'
                  ? resObj.message
                  : COMMON_ERROR_CODES.INVALID_REQUEST);

            let errors: IValidationErrorDetail[] | undefined = undefined;
            if (Array.isArray(resObj.message)) {
               errors = resObj.message.map((msg) => {
                  if (typeof msg === 'string') {
                     const field = msg.split(' ')[0] || 'field';
                     return { field, message: msg };
                  }
                  return msg as IValidationErrorDetail;
               });
            }

            payload = {
               statusCode: status,
               errorCode,
               message:
                  typeof resObj.message === 'string' && resObj.message !== '[object Object]'
                     ? resObj.message
                     : errorCode,
               ...(resObj.params ? { params: resObj.params as Record<string, unknown> } : {}),
               ...(resObj.details !== undefined ? { details: resObj.details } : {}),
               ...(errors ? { errors } : {}),
            };
         } else {
            const strMsg =
               typeof res === 'string' && res !== '[object Object]' ? res : COMMON_ERROR_CODES.INVALID_REQUEST;
            payload = {
               statusCode: status,
               errorCode: strMsg,
               message: strMsg,
            };
         }
      } else if (exception instanceof RpcException) {
         const error = exception.getError();
         if (typeof error === 'object' && error !== null) {
            payload = error as IAppExceptionPayload;
         } else if (typeof error === 'string') {
            try {
               const parsed = JSON.parse(error) as Record<string, unknown>;
               if (typeof parsed === 'object' && parsed !== null && (parsed.statusCode || parsed.errorCode)) {
                  payload = {
                     statusCode: (parsed.statusCode as number) || HttpStatus.BAD_REQUEST,
                     errorCode: (parsed.errorCode as string) || COMMON_ERROR_CODES.INVALID_REQUEST,
                     message:
                        (parsed.message as string) ||
                        (parsed.errorCode as string) ||
                        COMMON_ERROR_CODES.INVALID_REQUEST,
                     ...(parsed.params ? { params: parsed.params as Record<string, unknown> } : {}),
                     ...(parsed.details !== undefined ? { details: parsed.details } : {}),
                     ...(parsed.errors ? { errors: parsed.errors as IValidationErrorDetail[] } : {}),
                  };
               } else {
                  const safeMsg = error === '[object Object]' ? COMMON_ERROR_CODES.INVALID_REQUEST : error;
                  payload = {
                     statusCode: HttpStatus.BAD_REQUEST,
                     errorCode: safeMsg,
                     message: safeMsg,
                  };
               }
            } catch {
               const safeMsg = error === '[object Object]' ? COMMON_ERROR_CODES.INVALID_REQUEST : error;
               payload = {
                  statusCode: HttpStatus.BAD_REQUEST,
                  errorCode: safeMsg,
                  message: safeMsg,
               };
            }
         } else {
            payload = {
               statusCode: HttpStatus.BAD_REQUEST,
               errorCode: COMMON_ERROR_CODES.INVALID_REQUEST,
               message: COMMON_ERROR_CODES.INVALID_REQUEST,
            };
         }
      } else if (exception instanceof Error) {
         const expAny = exception as unknown as Record<string, unknown>;
         const nestedObj =
            typeof expAny.response === 'object' && expAny.response !== null
               ? (expAny.response as Record<string, unknown>)
               : typeof expAny.error === 'object' && expAny.error !== null
                 ? (expAny.error as Record<string, unknown>)
                 : typeof expAny.cause === 'object' && expAny.cause !== null
                   ? (expAny.cause as Record<string, unknown>)
                   : null;

         if (nestedObj) {
            const status = (nestedObj.statusCode as number) || HttpStatus.BAD_REQUEST;
            const errorCode: string =
               (nestedObj.errorCode as string) ||
               (typeof nestedObj.message === 'string' && nestedObj.message !== '[object Object]'
                  ? nestedObj.message
                  : COMMON_ERROR_CODES.INVALID_REQUEST);
            const message: string =
               typeof nestedObj.message === 'string' && nestedObj.message !== '[object Object]'
                  ? nestedObj.message
                  : errorCode;
            payload = {
               statusCode: status,
               errorCode,
               message,
               ...(nestedObj.params ? { params: nestedObj.params as Record<string, unknown> } : {}),
               ...(nestedObj.details !== undefined ? { details: nestedObj.details } : {}),
               ...(nestedObj.errors ? { errors: nestedObj.errors as IValidationErrorDetail[] } : {}),
            };
         } else {
            try {
               const parsed = JSON.parse(exception.message) as Record<string, unknown>;
               if (typeof parsed === 'object' && parsed !== null && (parsed.statusCode || parsed.errorCode)) {
                  payload = {
                     statusCode: (parsed.statusCode as number) || HttpStatus.BAD_REQUEST,
                     errorCode: (parsed.errorCode as string) || COMMON_ERROR_CODES.INVALID_REQUEST,
                     message:
                        (parsed.message as string) ||
                        (parsed.errorCode as string) ||
                        COMMON_ERROR_CODES.INVALID_REQUEST,
                     ...(parsed.params ? { params: parsed.params as Record<string, unknown> } : {}),
                     ...(parsed.details !== undefined ? { details: parsed.details } : {}),
                     ...(parsed.errors ? { errors: parsed.errors as IValidationErrorDetail[] } : {}),
                  };
               } else {
                  payload = {
                     statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                     errorCode: COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
                     message:
                        exception.message === '[object Object]'
                           ? COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR
                           : exception.message,
                  };
               }
            } catch {
               payload = {
                  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                  errorCode: COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
                  message:
                     exception.message === '[object Object]'
                        ? COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR
                        : exception.message,
               };
            }
         }
      } else if (typeof exception === 'object' && exception !== null) {
         const obj = exception as Record<string, unknown>;
         const statusCode = (obj.statusCode as number) || HttpStatus.INTERNAL_SERVER_ERROR;
         const errorCode =
            (obj.errorCode as string) ||
            (typeof obj.message === 'string' && obj.message !== '[object Object]'
               ? obj.message
               : COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR);
         const message = typeof obj.message === 'string' && obj.message !== '[object Object]' ? obj.message : errorCode;
         payload = {
            statusCode,
            errorCode,
            message,
            ...(obj.params ? { params: obj.params as Record<string, unknown> } : {}),
            ...(obj.details !== undefined ? { details: obj.details } : {}),
            ...(obj.errors ? { errors: obj.errors as IValidationErrorDetail[] } : {}),
         };
      } else {
         payload = {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorCode: COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR,
         };
      }

      if (
         typeof payload.message !== 'string' ||
         payload.message === '[object Object]' ||
         payload.message.includes('[object Object]')
      ) {
         payload.message = payload.errorCode || COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR;
      }

      this.logger.error(`RPC Exception caught: [${payload.statusCode}] ${payload.errorCode}`);

      return throwError(() => new RpcException(JSON.stringify(payload)));
   }
}
