import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TracingInterceptor } from '@common/tracing/interceptors/tracing.interceptor';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@common/logger/logger.constants';

describe('TracingInterceptor', () => {
   let interceptor: TracingInterceptor;

   beforeEach(() => {
      interceptor = new TracingInterceptor();
   });

   it('should be defined', () => {
      expect(interceptor).toBeDefined();
   });

   it('should handle HTTP context successfully', (done) => {
      const mockRequest = {
         headers: {
            [CORRELATION_ID_HEADER]: 'corr-http-123',
            [REQUEST_ID_HEADER]: 'req-http-456',
         },
         method: 'POST',
         route: { path: '/api/v1/auth/login' },
         user: { userId: 'u-999' },
      };
      const mockResponse = {
         statusCode: 200,
      };

      const mockExecutionContext = {
         getType: () => 'http',
         switchToHttp: () => ({
            getRequest: () => mockRequest,
            getResponse: () => mockResponse,
         }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
         handle: () => of({ success: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
         next: (val) => {
            expect(val).toEqual({ success: true });
         },
         complete: () => {
            done();
         },
      });
   });

   it('should handle HTTP error flow cleanly', (done) => {
      const mockRequest = {
         headers: {},
         method: 'GET',
         route: { path: '/api/v1/auth/profile' },
      };
      const mockResponse = {
         statusCode: 500,
      };

      const mockExecutionContext = {
         getType: () => 'http',
         switchToHttp: () => ({
            getRequest: () => mockRequest,
            getResponse: () => mockResponse,
         }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
         handle: () => throwError(() => new Error('Simulated HTTP exception')),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
         error: (err) => {
            expect(err.message).toBe('Simulated HTTP exception');
            done();
         },
      });
   });

   it('should handle RPC context', (done) => {
      const mockData = {
         correlationId: 'rpc-corr-777',
         requestId: 'rpc-req-888',
         userId: 'u-rpc-111',
      };

      const mockExecutionContext = {
         getType: () => 'rpc',
         switchToRpc: () => ({
            getData: () => mockData,
         }),
      } as unknown as ExecutionContext;

      const mockCallHandler: CallHandler = {
         handle: () => of({ success: true }),
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
         next: (val) => {
            expect(val).toEqual({ success: true });
            done();
         },
      });
   });
});
