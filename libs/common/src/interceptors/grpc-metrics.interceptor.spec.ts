import { ExecutionContext } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';
import { GrpcMetricsInterceptor } from '@common/interceptors/grpc-metrics.interceptor';
import type { IGrpcMetricsCollector } from '@common/interceptors/grpc-metrics.interface';
import { NotFoundException } from '@common/exceptions';

describe('GrpcMetricsInterceptor', () => {
   let interceptor: GrpcMetricsInterceptor;
   let mockCollector: jest.Mocked<IGrpcMetricsCollector>;

   beforeEach(() => {
      mockCollector = {
         recordGrpcCall: jest.fn(),
      };
      interceptor = new GrpcMetricsInterceptor(mockCollector);
   });

   it('should be defined', () => {
      expect(interceptor).toBeDefined();
   });

   it('should pass through non-rpc context without recording metrics', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('http'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of('response')),
      };

      const result$ = interceptor.intercept(mockContext, mockCallHandler);
      const result = await firstValueFrom(result$);

      expect(result).toBe('response');
      expect(mockCollector.recordGrpcCall).not.toHaveBeenCalled();
   });

   it('should pass through when metricsCollector is undefined', async () => {
      const noCollectorInterceptor = new GrpcMetricsInterceptor(undefined);
      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         getHandler: jest.fn().mockReturnValue({ name: 'checkEmail' }),
         getClass: jest.fn().mockReturnValue({ name: 'AuthGrpcController' }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of({ available: true })),
      };

      const result$ = noCollectorInterceptor.intercept(mockContext, mockCallHandler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ available: true });
   });

   it('should record success metrics on successful gRPC call', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         getHandler: jest.fn().mockReturnValue({ name: 'checkEmail' }),
         getClass: jest.fn().mockReturnValue({ name: 'AuthGrpcController' }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(of({ available: true })),
      };

      const result$ = interceptor.intercept(mockContext, mockCallHandler);
      const result = await firstValueFrom(result$);

      expect(result).toEqual({ available: true });
      expect(mockCollector.recordGrpcCall).toHaveBeenCalledWith(
         expect.objectContaining({
            service: 'AuthGrpcController',
            method: 'checkEmail',
            status: 'OK',
            durationSeconds: expect.any(Number),
         }),
      );
   });

   it('should record failure metrics with mapped status on error and rethrow', async () => {
      const mockContext = {
         getType: jest.fn().mockReturnValue('rpc'),
         getHandler: jest.fn().mockReturnValue({ name: 'checkUsername' }),
         getClass: jest.fn().mockReturnValue({ name: 'UserGrpcController' }),
      } as unknown as ExecutionContext;

      const error = new NotFoundException('USER.NOT_FOUND');
      const mockCallHandler = {
         handle: jest.fn().mockReturnValue(throwError(() => error)),
      };

      await expect(firstValueFrom(interceptor.intercept(mockContext, mockCallHandler))).rejects.toThrow(error);

      expect(mockCollector.recordGrpcCall).toHaveBeenCalledWith(
         expect.objectContaining({
            service: 'UserGrpcController',
            method: 'checkUsername',
            status: 'NOT_FOUND',
            durationSeconds: expect.any(Number),
         }),
      );
   });
});
