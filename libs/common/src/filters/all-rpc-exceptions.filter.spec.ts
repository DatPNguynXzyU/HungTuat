import { ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { BadRequestException } from '@common/exceptions';
import { AllRpcExceptionsFilter } from '@common/filters/all-rpc-exceptions.filter';

describe('AllRpcExceptionsFilter', () => {
   let filter: AllRpcExceptionsFilter;
   let mockHost: ArgumentsHost;

   beforeEach(() => {
      filter = new AllRpcExceptionsFilter();
      mockHost = {} as ArgumentsHost;
   });

   it('should catch AppException and transform into RpcException with payload', async () => {
      const appException = new BadRequestException('AUTH.EMAIL_ALREADY_EXISTS', {
         params: { email: 'test@example.com' },
      });

      const result$ = filter.catch(appException, mockHost);

      await expect(firstValueFrom(result$)).rejects.toThrow(RpcException);

      try {
         await firstValueFrom(result$);
      } catch (err) {
         expect(err).toBeInstanceOf(RpcException);
         const rpcError = (err as RpcException).getError();
         expect(JSON.parse(rpcError as string)).toEqual({
            statusCode: 400,
            errorCode: 'AUTH.EMAIL_ALREADY_EXISTS',
            message: 'AUTH.EMAIL_ALREADY_EXISTS',
            params: { email: 'test@example.com' },
         });
      }
   });
});
