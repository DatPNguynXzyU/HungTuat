import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import {
   CLIENT_TYPES,
   CircuitBreakerOpenException,
   CircuitBreakerRegistry,
   DEFAULT_ROLES,
   FixedBackoffStrategy,
   GrpcStatus,
   RetryPolicyRegistry,
   ServiceUnavailableException,
   UnauthorizedException,
} from '@common';
import {
   AUTH_ERROR_CODES,
   AUTH_V1_GRPC_CLIENT,
   AUTH_V1_GRPC_SERVICE_NAME,
   USER_STATUS,
   type ILoginResponse,
} from '@contracts/auth';
import { AuthService } from '@/modules/auth/auth.service';

describe('AuthService (Gateway)', () => {
   let service: AuthService;
   const mockAuthGrpcService = {
      checkEmail: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
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

   describe('login gRPC & Circuit Breaker', () => {
      const mockLoginResponse: ILoginResponse = {
         user: {
            userId: 'user-123',
            email: 'login@example.com',
            roles: [DEFAULT_ROLES.USER],
            status: USER_STATUS.ACTIVE,
            isEmailVerified: true,
            lastLoginAt: '2026-10-20T10:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-10-20T10:00:00.000Z',
         },
         accessToken: 'access-jwt-token',
         refreshToken: 'refresh-jwt-token',
         tokens: {
            accessToken: 'access-jwt-token',
            refreshToken: 'refresh-jwt-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
         },
      };

      it('should successfully login via gRPC and return IAuthResult', async () => {
         mockAuthGrpcService.login.mockReturnValue(of(mockLoginResponse));

         const result = await service.login(
            { email: 'login@example.com', password: 'Password123!' },
            { clientType: CLIENT_TYPES.WEB },
         );

         expect(result.accessToken).toBe('access-jwt-token');
         expect(result.refreshToken).toBe('refresh-jwt-token');
         expect(result.user.email).toBe('login@example.com');
         expect(result.user.roles).toContain(DEFAULT_ROLES.USER);
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should retry transient errors during login and succeed', async () => {
         let callCount = 0;
         mockAuthGrpcService.login.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
               return throwError(() => ({ code: GrpcStatus.UNAVAILABLE, message: 'connection reset' }));
            }
            return of(mockLoginResponse);
         });

         const result = await service.login({ email: 'login@example.com', password: 'Password123!' });
         expect(result.accessToken).toBe('access-jwt-token');
         expect(callCount).toBe(2);
      });

      it('should throw UnauthorizedException on invalid credentials without retrying', async () => {
         const authError = {
            code: GrpcStatus.UNAUTHENTICATED,
            message: JSON.stringify({
               statusCode: 401,
               errorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
               message: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            }),
         };
         mockAuthGrpcService.login.mockReturnValue(throwError(() => authError));

         await expect(service.login({ email: 'login@example.com', password: 'WrongPassword!' })).rejects.toThrow(
            UnauthorizedException,
         );
         // Non-retryable error should only be called once
         expect(mockAuthGrpcService.login).toHaveBeenCalledTimes(1);
      });
   });

   describe('refreshToken gRPC & Circuit Breaker', () => {
      const mockRefreshResponse: ILoginResponse = {
         user: {
            userId: 'user-123',
            email: 'refresh@example.com',
            roles: [DEFAULT_ROLES.USER],
            status: USER_STATUS.ACTIVE,
            isEmailVerified: true,
            lastLoginAt: '2026-10-20T10:00:00.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-10-20T10:00:00.000Z',
         },
         accessToken: 'new-access-jwt-token',
         refreshToken: 'new-refresh-jwt-token',
         tokens: {
            accessToken: 'new-access-jwt-token',
            refreshToken: 'new-refresh-jwt-token',
            tokenType: 'Bearer',
            expiresIn: 3600,
         },
      };

      it('should successfully refresh token via gRPC and return IAuthResult', async () => {
         mockAuthGrpcService.refreshToken.mockReturnValue(of(mockRefreshResponse));

         const result = await service.refreshToken('valid-token', { clientType: CLIENT_TYPES.WEB });

         expect(result.accessToken).toBe('new-access-jwt-token');
         expect(result.refreshToken).toBe('new-refresh-jwt-token');
         expect(result.user.email).toBe('refresh@example.com');
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should retry transient errors during refreshToken and succeed', async () => {
         let callCount = 0;
         mockAuthGrpcService.refreshToken.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
               return throwError(() => ({ code: GrpcStatus.UNAVAILABLE, message: 'connection reset' }));
            }
            return of(mockRefreshResponse);
         });

         const result = await service.refreshToken('valid-token');
         expect(result.accessToken).toBe('new-access-jwt-token');
         expect(callCount).toBe(2);
      });

      it('should throw UnauthorizedException on expired refresh token without retrying', async () => {
         const authError = {
            code: GrpcStatus.UNAUTHENTICATED,
            message: JSON.stringify({
               statusCode: 401,
               errorCode: AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
               message: AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
            }),
         };
         mockAuthGrpcService.refreshToken.mockReturnValue(throwError(() => authError));

         await expect(service.refreshToken('expired-token')).rejects.toThrow(UnauthorizedException);
         expect(mockAuthGrpcService.refreshToken).toHaveBeenCalledTimes(1);
      });
   });
});
