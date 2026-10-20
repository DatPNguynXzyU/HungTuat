import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import {
   CircuitBreakerOpenException,
   CircuitBreakerRegistry,
   FixedBackoffStrategy,
   GrpcStatus,
   RetryPolicyRegistry,
   SERVICES,
   ServiceUnavailableException,
} from '@common';
import { AUTH_V1_GRPC_CLIENT, AUTH_V1_GRPC_SERVICE_NAME } from '@contracts/auth';
import { AuthService } from '@/modules/auth/auth.service';

describe('AuthService (Gateway)', () => {
   let service: AuthService;
   const mockAuthClient = {
      send: jest.fn(),
   };
   const mockAuthGrpcService = {
      checkEmail: jest.fn(),
   };
   const mockAuthGrpcClient = {
      getService: jest.fn().mockReturnValue(mockAuthGrpcService),
   };

   beforeEach(async () => {
      CircuitBreakerRegistry.clear();
      RetryPolicyRegistry.clear();
      // Configure fast backoff in tests
      RetryPolicyRegistry.getOrCreate(AUTH_V1_GRPC_SERVICE_NAME, {
         maxAttempts: 3,
         backoff: new FixedBackoffStrategy(1),
      });
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthService,
            {
               provide: SERVICES.AUTH_SERVICE,
               useValue: mockAuthClient,
            },
            {
               provide: AUTH_V1_GRPC_CLIENT,
               useValue: mockAuthGrpcClient,
            },
         ],
      }).compile();

      service = module.get<AuthService>(AuthService);
      service.onModuleInit();
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('checkEmail Circuit Breaker', () => {
      it('should return availability successfully via gRPC', async () => {
         mockAuthGrpcService.checkEmail.mockReturnValue(of({ available: true, email: 'test@example.com' }));

         const result = await service.checkEmail('test@example.com');
         expect(result).toEqual({ available: true, email: 'test@example.com' });
         expect(mockAuthGrpcClient.getService).toHaveBeenCalledWith(AUTH_V1_GRPC_SERVICE_NAME);
      });

      it('should transparently retry and succeed on transient gRPC error', async () => {
         let callCount = 0;
         mockAuthGrpcService.checkEmail.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
               return throwError(() => ({ code: GrpcStatus.UNAVAILABLE, message: 'connection refused' }));
            }
            return of({ available: true, email: 'retry@example.com' });
         });

         const result = await service.checkEmail('retry@example.com');
         expect(result).toEqual({ available: true, email: 'retry@example.com' });
         expect(callCount).toBe(2);
      });

      it('should trip circuit to OPEN when Auth microservice is down and fail-fast without hanging', async () => {
         const unavailableError = {
            code: GrpcStatus.UNAVAILABLE,
            message: '14 UNAVAILABLE: connection refused',
         };
         mockAuthGrpcService.checkEmail.mockReturnValue(throwError(() => unavailableError));

         // 5 failures to trip breaker
         for (let i = 0; i < 5; i++) {
            await expect(service.checkEmail('test@example.com')).rejects.toThrow(ServiceUnavailableException);
         }

         // 6th call should immediately fail-fast (0ms) due to OPEN circuit without calling gRPC
         const callCountBefore = mockAuthGrpcService.checkEmail.mock.calls.length;
         await expect(service.checkEmail('test@example.com')).rejects.toThrow(CircuitBreakerOpenException);
         expect(mockAuthGrpcService.checkEmail.mock.calls.length).toBe(callCountBefore);
      });
   });
});
