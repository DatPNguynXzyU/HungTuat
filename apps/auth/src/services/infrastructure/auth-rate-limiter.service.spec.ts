import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_ERROR_CODES, COMMON_ERROR_CODES, RedisService, TooManyRequestsException } from '@common';
import { AuthRateLimiter } from './auth-rate-limiter.service';
import { AUTH_RATE_LIMITER } from './auth-rate-limiter.interface';

describe('AuthRateLimiter', () => {
   let service: AuthRateLimiter;

   const mockRedisService = {
      incr: jest.fn(),
      expire: jest.fn(),
      deleteByPattern: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthRateLimiter,
            {
               provide: AUTH_RATE_LIMITER,
               useExisting: AuthRateLimiter,
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      service = module.get<AuthRateLimiter>(AuthRateLimiter);
   });

   describe('checkRateLimit', () => {
      it('should allow request within limits and set expire on first request', async () => {
         mockRedisService.incr.mockResolvedValue(1);
         mockRedisService.expire.mockResolvedValue(undefined);

         const result = await service.checkRateLimit('login:test@example.com:127.0.0.1', 10, 60);

         expect(result.allowed).toBe(true);
         expect(result.remaining).toBe(9);
         expect(result.retryAfter).toBeGreaterThan(0);
         expect(result.resetAt).toBeInstanceOf(Date);
         expect(mockRedisService.incr).toHaveBeenCalled();
         expect(mockRedisService.expire).toHaveBeenCalled();
      });

      it('should not set expire if current count > 1', async () => {
         mockRedisService.incr.mockResolvedValue(5);

         const result = await service.checkRateLimit('login:test@example.com:127.0.0.1', 10, 60);

         expect(result.allowed).toBe(true);
         expect(result.remaining).toBe(5);
         expect(mockRedisService.expire).not.toHaveBeenCalled();
      });

      it('should return allowed = false and remaining = 0 when limit is exceeded', async () => {
         mockRedisService.incr.mockResolvedValue(11);

         const result = await service.checkRateLimit('login:test@example.com:127.0.0.1', 10, 60);

         expect(result.allowed).toBe(false);
         expect(result.remaining).toBe(0);
         expect(mockRedisService.expire).not.toHaveBeenCalled();
      });
   });

   describe('checkOrThrow', () => {
      it('should resolve without throwing when under limit', async () => {
         mockRedisService.incr.mockResolvedValue(2);

         await expect(service.checkOrThrow('test-key', 5, 60)).resolves.toBeUndefined();
      });

      it('should throw TooManyRequestsException with params when limit exceeded', async () => {
         mockRedisService.incr.mockResolvedValue(6);

         await expect(
            service.checkOrThrow('test-key', 5, 60, AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS),
         ).rejects.toThrow(TooManyRequestsException);

         try {
            await service.checkOrThrow('test-key', 5, 60, AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS);
         } catch (error) {
            const ex = error as TooManyRequestsException;
            expect(ex.errorCode).toBe(AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS);
            const payload = ex.getPayload();
            expect(payload.params).toBeDefined();
            expect(payload.params?.limit).toBe(5);
            expect(payload.params?.window).toBe(60);
            expect(payload.params?.retryAfter).toBeGreaterThan(0);
            expect(payload.params?.resetAt).toBeDefined();
         }
      });

      it('should default errorCode to COMMON_ERROR_CODES.TOO_MANY_REQUESTS', async () => {
         mockRedisService.incr.mockResolvedValue(10);

         try {
            await service.checkOrThrow('test-key', 5, 60);
         } catch (error) {
            const ex = error as TooManyRequestsException;
            expect(ex.errorCode).toBe(COMMON_ERROR_CODES.TOO_MANY_REQUESTS);
         }
      });
   });

   describe('reset', () => {
      it('should delete keys by pattern', async () => {
         mockRedisService.deleteByPattern.mockResolvedValue(2);

         await service.reset('test-key');

         expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith('ratelimit:test-key:*');
      });
   });

   describe('Endpoint Facade Methods', () => {
      it('checkLogin should enforce login rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkLogin('user@example.com', '127.0.0.1');
         expect(spy).toHaveBeenCalledWith(
            'login:user@example.com:127.0.0.1',
            10,
            60,
            AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS,
         );
      });

      it('checkSendRegisterOtp should enforce send OTP rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkSendRegisterOtp('user@example.com');
         expect(spy).toHaveBeenCalledWith(
            'otp:register:user@example.com',
            3,
            60,
            AUTH_ERROR_CODES.OTP_RATE_LIMIT_EXCEEDED,
         );
      });

      it('checkVerifyRegisterOtp should enforce verify OTP rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkVerifyRegisterOtp('user@example.com');
         expect(spy).toHaveBeenCalledWith(
            'otp:verify:user@example.com',
            5,
            300,
            AUTH_ERROR_CODES.OTP_VERIFY_RATE_LIMIT_EXCEEDED,
         );
      });

      it('checkChangePassword should enforce change password rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkChangePassword('acc-123');
         expect(spy).toHaveBeenCalledWith(
            'password:change:acc-123',
            3,
            3600,
            AUTH_ERROR_CODES.PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED,
         );
      });

      it('checkVerifyChangePasswordOtp should enforce verify change password OTP rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkVerifyChangePasswordOtp('acc-123');
         expect(spy).toHaveBeenCalledWith(
            'otp:verify-pwd:acc-123',
            5,
            300,
            AUTH_ERROR_CODES.OTP_VERIFY_RATE_LIMIT_EXCEEDED,
         );
      });

      it('checkRefreshToken should enforce token refresh rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkRefreshToken('acc-123');
         expect(spy).toHaveBeenCalledWith(
            'refresh:acc-123',
            20,
            60,
            AUTH_ERROR_CODES.TOKEN_REFRESH_RATE_LIMIT_EXCEEDED,
         );
      });

      it('checkEmail should enforce check email rate limit', async () => {
         const spy = jest.spyOn(service, 'checkOrThrow').mockResolvedValue(undefined);
         await service.checkEmail('user@example.com');
         expect(spy).toHaveBeenCalledWith(
            'check-email:user@example.com',
            10,
            60,
            AUTH_ERROR_CODES.CHECK_EMAIL_RATE_LIMIT_EXCEEDED,
         );
      });
   });
});
