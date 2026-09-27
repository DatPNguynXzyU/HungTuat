import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { IAppExceptionPayload } from '@common/exceptions/exception.types';

export class RpcAppException extends RpcException {
   constructor(payload: IAppExceptionPayload | string, statusCode: HttpStatus = HttpStatus.BAD_REQUEST) {
      super(
         typeof payload === 'string'
            ? {
                 statusCode,
                 errorCode: payload,
                 message: payload,
              }
            : payload,
      );
   }
}
