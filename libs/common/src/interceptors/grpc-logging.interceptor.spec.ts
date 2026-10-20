import { ExecutionContext } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { GrpcLoggingInterceptor } from '@common/interceptors/grpc-logging.interceptor';
import { BadRequestException } from '@common/exceptions';
import { CORRELATION_ID_HEADER } from '@common/logger/logger.constants';

describe('GrpcLoggingInterceptor', () => {
   let interceptor: GrpcLoggingInterceptor;

   beforeEach(() => {
      interceptor = new GrpcLoggingInterceptor();
   });

   it('should be defined', () => {
      expect(interceptor).toBeDefined();
   });

   it('should pass through non-rpc context without modification', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of('response')),
      };

      const result$ = interceptor.intercept(mockContext, mockCallHandler);
      const result = await firstValueFrom(result$);

      expect(result).toBe('response');
      expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);
   });

   it('should intercept gRPC call, log request and response, and sanitize payload', async () => {
      const mockMetadata = {
         get: jest.fn().mockReturnValue(['test-correlation-id']),
      };

      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         switchToRpc: jest.fn().mockReturnValue({
            getContext: jest.fn().mockReturnValue(mockMetadata),
            getData: jest.fn().mockReturnValue({
               email: 'test@example.com',
               password: 'secretPassword123',
            }),
         }),
         getHandler: jest.fn().mockReturnValue({ name: 'checkEmail' }),
         getClass: jest.fn().mockReturnValue({ name: 'AuthGrpcController' }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of({ available: true })),
      };

      const logSpy = jest.spyOn((interceptor as unknown as { logger: { log: jest.Mock } }).logger, 'log');

      const result$ = interceptor.intercept(mockContext, mockCallHandler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ available: true });
      expect(logSpy).toHaveBeenCalledTimes(2);

      // Check request log
      expect(logSpy).toHaveBeenNthCalledWith(
         1,
         expect.objectContaining({
            correlationId: 'test-correlation-id',
            target: 'AuthGrpcController#checkEmail',
            data: {
               email: 'test@example.com',
               password: '***REDACTED***',
            },
         }),
      );

      // Check response log
      expect(logSpy).toHaveBeenNthCalledWith(
         2,
         expect.objectContaining({
            correlationId: 'test-correlation-id',
            target: 'AuthGrpcController#checkEmail',
            status: 'OK',
         }),
      );
   });

   it('should handle plain object metadata and extract correlationId header', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         switchToRpc: jest.fn().mockReturnValue({
            getContext: jest.fn().mockReturnValue({
               [CORRELATION_ID_HEADER]: 'plain-corr-id',
            }),
            getData: jest.fn().mockReturnValue({}),
         }),
         getHandler: jest.fn().mockReturnValue({ name: 'checkUsername' }),
         getClass: jest.fn().mockReturnValue({ name: 'UserGrpcController' }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of({ available: true })),
      };

      const logSpy = jest.spyOn((interceptor as unknown as { logger: { log: jest.Mock } }).logger, 'log');

      await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

      expect(logSpy).toHaveBeenCalledWith(
         expect.objectContaining({
            correlationId: 'plain-corr-id',
            target: 'UserGrpcController#checkUsername',
         }),
      );
   });

   it('should log error with mapped gRPC status name and rethrow error', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         switchToRpc: jest.fn().mockReturnValue({
            getContext: jest.fn().mockReturnValue({}),
            getData: jest.fn().mockReturnValue({ email: 'bad' }),
         }),
         getHandler: jest.fn().mockReturnValue({ name: 'checkEmail' }),
         getClass: jest.fn().mockReturnValue({ name: 'AuthGrpcController' }),
      } as unknown as ExecutionContext;

      const appException = new BadRequestException('AUTH.INVALID_EMAIL');
      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(throwError(() => appException)),
      };

      const errorSpy = jest.spyOn((interceptor as unknown as { logger: { error: jest.Mock } }).logger, 'error');

      await expect(firstValueFrom(interceptor.intercept(mockContext, mockCallHandler))).rejects.toThrow(appException);

      expect(errorSpy).toHaveBeenCalledWith(
         expect.objectContaining({
            target: 'AuthGrpcController#checkEmail',
            status: 'INVALID_ARGUMENT',
            error: 'AUTH.INVALID_EMAIL',
         }),
      );
   });
});
