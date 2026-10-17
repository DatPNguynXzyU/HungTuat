import { Test, TestingModule } from '@nestjs/testing';
import { CacheNamespace, CacheService, COMMON_ERROR_CODES, RedisService, TooManyRequestsException } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import {
   AuthRateLimitKeys,
   buildLegacyRateLimitKey,
   buildLegacyRateLimitPattern,
   buildWildcardPattern,
   buildWindowCounterKey,
   joinKeySegments,
   RATE_LIMIT_KEY_PREFIX,
} from '@auth/constants';
import { AuthRateLimiter } from '@auth/services/infrastructure/auth-rate-limiter.service';
import { AUTH_RATE_LIMITER } from '@auth/services/infrastructure/auth-rate-limiter.interface';

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

   describe('with CacheService', () => {
      let cacheRateLimiter: AuthRateLimiter;
      const mockCacheService = {
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
                  provide: RedisService,
                  useValue: mockRedisService,
               },
               {
                  provide: CacheService,
                  useValue: mockCacheService,
               },
            ],
         }).compile();

         cacheRateLimiter = module.get<AuthRateLimiter>(AuthRateLimiter);
      });

      it('should delegate to cacheService using CacheNamespace.RATE_LIMIT', async () => {
         mockCacheService.incr.mockResolvedValue(1);
         mockCacheService.expire.mockResolvedValue(undefined);

         const result = await cacheRateLimiter.checkRateLimit('login:test@example.com', 5, 60);

         expect(result.allowed).toBe(true);
         expect(mockCacheService.incr).toHaveBeenCalledWith(
            CacheNamespace.RATE_LIMIT,
            expect.stringContaining('login:test@example.com:'),
         );
         expect(mockCacheService.expire).toHaveBeenCalledWith(CacheNamespace.RATE_LIMIT, expect.any(String), 60);
      });

      it('should reset rate limit using cacheService.deleteByPattern', async () => {
         mockCacheService.deleteByPattern.mockResolvedValue(2);
         await cacheRateLimiter.reset('login:test@example.com');
         expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith(
            CacheNamespace.RATE_LIMIT,
            'login:test@example.com:*',
         );
      });
   });

   describe('AuthRateLimitKeys helper', () => {
      it('should verify const helper functions', () => {
         expect(joinKeySegments('a', 'b', 1)).toBe('a:b:1');
         expect(buildWildcardPattern('prefix')).toBe('prefix:*');
         expect(buildWindowCounterKey('test', 99)).toBe('test:99');
         expect(buildLegacyRateLimitKey('test', 99)).toBe('ratelimit:test:99');
         expect(buildLegacyRateLimitPattern('test')).toBe('ratelimit:test:*');
         expect(RATE_LIMIT_KEY_PREFIX.LEGACY_PREFIX).toBe('ratelimit:');
         expect(RATE_LIMIT_KEY_PREFIX.WILDCARD_PATTERN).toBe('*');
      });

      it('should build correct sliding window and pattern keys', () => {
         expect(AuthRateLimitKeys.windowCounter('login:user@example.com', 12345)).toBe('login:user@example.com:12345');
         expect(AuthRateLimitKeys.pattern('login:user@example.com')).toBe('login:user@example.com:*');
         expect(AuthRateLimitKeys.legacyWindowCounter('login', 100)).toBe('ratelimit:login:100');
         expect(AuthRateLimitKeys.legacyPattern('login')).toBe('ratelimit:login:*');
      });

      it('should build correct endpoint keys', () => {
         expect(AuthRateLimitKeys.login('user@example.com', '127.0.0.1')).toBe('login:user@example.com:127.0.0.1');
         expect(AuthRateLimitKeys.sendRegisterOtp('user@example.com')).toBe('otp:register:user@example.com');
         expect(AuthRateLimitKeys.verifyRegisterOtp('user@example.com')).toBe('otp:verify:user@example.com');
         expect(AuthRateLimitKeys.changePassword('acc-1')).toBe('password:change:acc-1');
         expect(AuthRateLimitKeys.verifyChangePasswordOtp('acc-1')).toBe('otp:verify-pwd:acc-1');
         expect(AuthRateLimitKeys.refreshToken('acc-1')).toBe('refresh:acc-1');
         expect(AuthRateLimitKeys.checkEmail('user@example.com')).toBe('check-email:user@example.com');
      });
   });
});
