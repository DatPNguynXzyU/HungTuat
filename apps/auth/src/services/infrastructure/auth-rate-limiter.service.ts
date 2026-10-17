import { Injectable, Logger, Optional } from '@nestjs/common';
import { CacheNamespace, CacheService, COMMON_ERROR_CODES, RedisService, TooManyRequestsException } from '@common';
import { AUTH_RATE_LIMIT_CONFIG, AuthRateLimitKeys } from '@auth/constants';
import { IAuthRateLimiter, RateLimitResult } from '@auth/services/infrastructure/auth-rate-limiter.interface';

@Injectable()
export class AuthRateLimiter implements IAuthRateLimiter {
   private readonly logger = new Logger(AuthRateLimiter.name);

   constructor(
      private readonly redisService: RedisService,
      @Optional() private readonly cacheService?: CacheService,
   ) {}

   /**
    * Check rate limit using sliding window counter
    */
   async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult> {
      const now = Date.now();
      const windowStart = Math.floor(now / 1000 / windowSeconds);

      let current: number;
      if (this.cacheService) {
         const subKey = AuthRateLimitKeys.windowCounter(key, windowStart);
         current = await this.cacheService.incr(CacheNamespace.RATE_LIMIT, subKey);
         if (current === 1) {
            await this.cacheService.expire(CacheNamespace.RATE_LIMIT, subKey, windowSeconds);
         }
      } else {
         const rateLimitKey = AuthRateLimitKeys.legacyWindowCounter(key, windowStart);
         current = await this.redisService.incr(rateLimitKey);
         if (current === 1) {
            await this.redisService.expire(rateLimitKey, windowSeconds);
         }
      }

      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      const resetAt = new Date((windowStart + 1) * windowSeconds * 1000);
      const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));

      if (!allowed) {
         this.logger.warn(`Rate limit exceeded for key: ${key} (${current}/${maxRequests} in ${windowSeconds}s)`);
      }

      return {
         allowed,
         remaining,
         resetAt,
         retryAfter,
      };
   }

   /**
    * Check and throw if rate limit exceeded
    */
   async checkOrThrow(
      key: string,
      maxRequests: number,
      windowSeconds: number,
      errorCode: string = COMMON_ERROR_CODES.TOO_MANY_REQUESTS,
   ): Promise<void> {
      const result = await this.checkRateLimit(key, maxRequests, windowSeconds);

      if (!result.allowed) {
         throw new TooManyRequestsException(errorCode, {
            params: {
               limit: maxRequests,
               window: windowSeconds,
               retryAfter: result.retryAfter,
               resetAt: result.resetAt.toISOString(),
            },
         });
      }
   }

   /**
    * Reset rate limit for a key (admin operation)
    */
   async reset(key: string): Promise<void> {
      if (this.cacheService) {
         await this.cacheService.deleteByPattern(CacheNamespace.RATE_LIMIT, AuthRateLimitKeys.pattern(key));
      } else {
         await this.redisService.deleteByPattern(AuthRateLimitKeys.legacyPattern(key));
      }
   }

   /**
    * Rate limit check for login endpoint
    */
   async checkLogin(email: string, ip: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.LOGIN;
      await this.checkOrThrow(AuthRateLimitKeys.login(email, ip), cfg.maxRequests, cfg.windowSeconds, cfg.errorCode);
   }

   /**
    * Rate limit check for sending register OTP
    */
   async checkSendRegisterOtp(email: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.SEND_REGISTER_OTP;
      await this.checkOrThrow(
         AuthRateLimitKeys.sendRegisterOtp(email),
         cfg.maxRequests,
         cfg.windowSeconds,
         cfg.errorCode,
      );
   }

   /**
    * Rate limit check for verifying register OTP
    */
   async checkVerifyRegisterOtp(email: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.VERIFY_REGISTER_OTP;
      await this.checkOrThrow(
         AuthRateLimitKeys.verifyRegisterOtp(email),
         cfg.maxRequests,
         cfg.windowSeconds,
         cfg.errorCode,
      );
   }

   /**
    * Rate limit check for requesting change password OTP
    */
   async checkChangePassword(accountId: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.CHANGE_PASSWORD;
      await this.checkOrThrow(
         AuthRateLimitKeys.changePassword(accountId),
         cfg.maxRequests,
         cfg.windowSeconds,
         cfg.errorCode,
      );
   }

   /**
    * Rate limit check for verifying change password OTP
    */
   async checkVerifyChangePasswordOtp(accountId: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.VERIFY_CHANGE_PASSWORD_OTP;
      await this.checkOrThrow(
         AuthRateLimitKeys.verifyChangePasswordOtp(accountId),
         cfg.maxRequests,
         cfg.windowSeconds,
         cfg.errorCode,
      );
   }

   /**
    * Rate limit check for token refresh
    */
   async checkRefreshToken(accountId: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.REFRESH_TOKEN;
      await this.checkOrThrow(
         AuthRateLimitKeys.refreshToken(accountId),
         cfg.maxRequests,
         cfg.windowSeconds,
         cfg.errorCode,
      );
   }

   /**
    * Rate limit check for checking email availability
    */
   async checkEmail(email: string): Promise<void> {
      const cfg = AUTH_RATE_LIMIT_CONFIG.CHECK_EMAIL;
      await this.checkOrThrow(AuthRateLimitKeys.checkEmail(email), cfg.maxRequests, cfg.windowSeconds, cfg.errorCode);
   }
}
