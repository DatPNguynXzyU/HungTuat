import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { RESPONSE_MESSAGE_KEY } from '@common/decorators/response-message.decorator';
import { LOG_ACTION_KEY } from '@common/logger/logger.constants';

describe('TransformInterceptor', () => {
   let interceptor: TransformInterceptor<unknown>;
   let reflector: Reflector;

   beforeEach(() => {
      reflector = new Reflector();
      interceptor = new TransformInterceptor(reflector);
   });

   it('should transform response and set request properties for logger', (done) => {
      const mockRequest: Record<string, unknown> = {
         id: 'req-1234',
         headers: {
            'x-correlation-id': 'corr-5678',
         },
      };

      const mockResponse = {
         statusCode: 200,
      };

      const mockContext = {
         switchToHttp: () => ({
            getRequest: () => mockRequest,
            getResponse: () => mockResponse,
         }),
         getHandler: () => ({}),
      } as unknown as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key: unknown) => {
         if (key === RESPONSE_MESSAGE_KEY) return 'AUTH.LOGIN_SUCCESS';
         if (key === LOG_ACTION_KEY) return 'AUTH.LOGIN_ACTION';
         return undefined;
      });

      const callHandler: CallHandler = {
         handle: () => of({ user: { id: 'usr_123', email: 'user@test.com' } }),
      };

      interceptor.intercept(mockContext, callHandler).subscribe({
         next: (result) => {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.message).toBe('AUTH.LOGIN_SUCCESS');
            expect(result.correlationId).toBe('corr-5678');
            expect(mockRequest.action).toBe('AUTH.LOGIN_ACTION');
            expect(mockRequest.customLogMessage).toBe('AUTH.LOGIN_SUCCESS');
            expect(mockRequest.userId).toBe('usr_123');
            done();
         },
      });
   });
});
