import { ExecutionContext, CallHandler } from '@nestjs/common';
import { TimeoutError, of, throwError, firstValueFrom } from 'rxjs';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { TimeoutException } from '@common/exceptions/http.exceptions';
import { TimeoutInterceptor } from '@common/interceptors/timeout.interceptor';

describe('TimeoutInterceptor', () => {
   let interceptor: TimeoutInterceptor;
   let mockContext: ExecutionContext;

   beforeEach(() => {
      interceptor = new TimeoutInterceptor(100);
      mockContext = {} as ExecutionContext;
   });

   it('should pass through successful observable values', async () => {
      const next: CallHandler = {
         handle: () => of({ success: true, data: 'ok' }),
      };

      const result = await firstValueFrom(interceptor.intercept(mockContext, next));
      expect(result).toEqual({ success: true, data: 'ok' });
   });

   it('should transform TimeoutError into TimeoutException', async () => {
      const next: CallHandler = {
         handle: () => throwError(() => new TimeoutError()),
      };

      await expect(firstValueFrom(interceptor.intercept(mockContext, next))).rejects.toThrow(TimeoutException);

      try {
         await firstValueFrom(interceptor.intercept(mockContext, next));
      } catch (err) {
         expect(err).toBeInstanceOf(TimeoutException);
         expect((err as TimeoutException).errorCode).toBe(COMMON_ERROR_CODES.TIMEOUT);
      }
   });

   it('should preserve plain RPC error objects without wrapping into Error("[object Object]")', async () => {
      const rpcErrorPayload = {
         statusCode: 400,
         errorCode: 'AUTH.VERIFICATION_TOKEN_INVALID',
         message: 'AUTH.VERIFICATION_TOKEN_INVALID',
      };

      const next: CallHandler = {
         handle: () => throwError(() => rpcErrorPayload),
      };

      try {
         await firstValueFrom(interceptor.intercept(mockContext, next));
         fail('Should have thrown');
      } catch (err) {
         expect(err).toEqual(rpcErrorPayload);
         expect(err).not.toBeInstanceOf(Error);
      }
   });

   it('should preserve standard Error objects', async () => {
      const customError = new Error('Custom error');

      const next: CallHandler = {
         handle: () => throwError(() => customError),
      };

      try {
         await firstValueFrom(interceptor.intercept(mockContext, next));
         fail('Should have thrown');
      } catch (err) {
         expect(err).toBe(customError);
      }
   });
});
