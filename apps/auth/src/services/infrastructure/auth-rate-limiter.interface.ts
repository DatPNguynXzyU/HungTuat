export interface RateLimitResult {
   allowed: boolean;
   remaining: number;
   resetAt: Date;
   retryAfter: number; // seconds
}

export const AUTH_RATE_LIMITER = Symbol('AUTH_RATE_LIMITER');

export interface IAuthRateLimiter {
   /**
    * Check rate limit using sliding window counter
    */
   checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<RateLimitResult>;

   /**
    * Check and throw TooManyRequestsException if rate limit exceeded
    */
   checkOrThrow(key: string, maxRequests: number, windowSeconds: number, errorCode?: string): Promise<void>;

   /**
    * Reset rate limit for a key (admin operation)
    */
   reset(key: string): Promise<void>;

   /**
    * Rate limit check for login endpoint
    */
   checkLogin(email: string, ip: string): Promise<void>;

   /**
    * Rate limit check for sending register OTP
    */
   checkSendRegisterOtp(email: string): Promise<void>;

   /**
    * Rate limit check for verifying register OTP
    */
   checkVerifyRegisterOtp(email: string): Promise<void>;

   /**
    * Rate limit check for requesting change password OTP
    */
   checkChangePassword(accountId: string): Promise<void>;

   /**
    * Rate limit check for verifying change password OTP
    */
   checkVerifyChangePasswordOtp(accountId: string): Promise<void>;

   /**
    * Rate limit check for token refresh
    */
   checkRefreshToken(accountId: string): Promise<void>;

   /**
    * Rate limit check for checking email availability
    */
   checkEmail(email: string): Promise<void>;
}
