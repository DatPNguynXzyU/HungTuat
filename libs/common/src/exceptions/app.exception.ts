import { HttpException, HttpStatus } from '@nestjs/common';
import { AppExceptionInput, IAppExceptionPayload } from '@common/exceptions/exception.types';

export class AppException extends HttpException {
   public readonly errorCode: string;
   public readonly params?: Record<string, unknown>;
   public readonly details?: unknown;
   public readonly validationErrors?: IAppExceptionPayload['errors'];

   constructor(options: AppExceptionInput, defaultStatusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
      if (typeof options === 'string') {
         const payload: IAppExceptionPayload = {
            statusCode: defaultStatusCode,
            errorCode: options,
            message: options,
         };
         super(payload, defaultStatusCode);
         this.errorCode = options;
      } else {
         const statusCode = options.statusCode ?? defaultStatusCode;
         const payload: IAppExceptionPayload = {
            statusCode,
            errorCode: options.errorCode,
            message: options.message || options.errorCode,
            ...(options.params ? { params: options.params } : {}),
            ...(options.details !== undefined ? { details: options.details } : {}),
            ...(options.errors && options.errors.length > 0 ? { errors: options.errors } : {}),
         };
         super(payload, statusCode, { cause: options.cause });
         this.errorCode = options.errorCode;
         this.params = options.params;
         this.details = options.details;
         this.validationErrors = options.errors;
      }
   }

   getPayload(): IAppExceptionPayload {
      const response = this.getResponse();
      if (typeof response === 'object' && response !== null) {
         return response as IAppExceptionPayload;
      }
      return {
         statusCode: this.getStatus(),
         errorCode: this.errorCode,
         message: this.message || this.errorCode,
         params: this.params,
         details: this.details,
         errors: this.validationErrors,
      };
   }
}
