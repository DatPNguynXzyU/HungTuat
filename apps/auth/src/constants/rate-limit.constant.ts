import { AUTH_ERROR_CODES, type AuthErrorCode } from '@contracts/auth';

export interface RateLimitEndpointConfig {
   keyPrefix: string;
   maxRequests: number;
   windowSeconds: number;
   errorCode: AuthErrorCode;
}

export const AUTH_RATE_LIMIT_CONFIG = {
   LOGIN: {
      keyPrefix: 'login',
      maxRequests: 10,
      windowSeconds: 60,
      errorCode: AUTH_ERROR_CODES.TOO_MANY_LOGIN_ATTEMPTS,
   },
   SEND_REGISTER_OTP: {
      keyPrefix: 'otp:register',
      maxRequests: 3,
      windowSeconds: 60,
      errorCode: AUTH_ERROR_CODES.OTP_RATE_LIMIT_EXCEEDED,
   },
   VERIFY_REGISTER_OTP: {
      keyPrefix: 'otp:verify',
      maxRequests: 5,
      windowSeconds: 300,
      errorCode: AUTH_ERROR_CODES.OTP_VERIFY_RATE_LIMIT_EXCEEDED,
   },
   CHANGE_PASSWORD: {
      keyPrefix: 'password:change',
      maxRequests: 3,
      windowSeconds: 3600,
      errorCode: AUTH_ERROR_CODES.PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED,
   },
   VERIFY_CHANGE_PASSWORD_OTP: {
      keyPrefix: 'otp:verify-pwd',
      maxRequests: 5,
      windowSeconds: 300,
      errorCode: AUTH_ERROR_CODES.OTP_VERIFY_RATE_LIMIT_EXCEEDED,
   },
   REFRESH_TOKEN: {
      keyPrefix: 'refresh',
      maxRequests: 20,
      windowSeconds: 60,
      errorCode: AUTH_ERROR_CODES.TOKEN_REFRESH_RATE_LIMIT_EXCEEDED,
   },
   CHECK_EMAIL: {
      keyPrefix: 'check-email',
      maxRequests: 10,
      windowSeconds: 60,
      errorCode: AUTH_ERROR_CODES.CHECK_EMAIL_RATE_LIMIT_EXCEEDED,
   },
} as const satisfies Record<string, RateLimitEndpointConfig>;

/**
 * Prefix and delimiter constants for rate limiter Redis keys.
 */
export const RATE_LIMIT_KEY_PREFIX = {
   LEGACY_PREFIX: 'ratelimit:',
   WILDCARD_PATTERN: '*',
} as const;

/**
 * Combines key segments using standard colon delimiter.
 */
export const joinKeySegments = (...parts: (string | number)[]): string => parts.join(':');

/**
 * Builds a wildcard pattern for pattern matching and deletion.
 */
export const buildWildcardPattern = (baseKey: string): string => `${baseKey}:${RATE_LIMIT_KEY_PREFIX.WILDCARD_PATTERN}`;

/**
 * Builds a sliding window counter key under the rate_limit namespace.
 */
export const buildWindowCounterKey = (key: string, windowStart: number): string => joinKeySegments(key, windowStart);

/**
 * Builds a legacy Redis rate limit key with the legacy prefix.
 */
export const buildLegacyRateLimitKey = (key: string, windowStart: number): string =>
   `${RATE_LIMIT_KEY_PREFIX.LEGACY_PREFIX}${joinKeySegments(key, windowStart)}`;

/**
 * Builds a legacy Redis wildcard pattern for deletion.
 */
export const buildLegacyRateLimitPattern = (key: string): string =>
   `${RATE_LIMIT_KEY_PREFIX.LEGACY_PREFIX}${buildWildcardPattern(key)}`;

/**
 * Single source of truth for constructing Rate Limit Redis keys and sliding windows.
 * Eliminates ad-hoc string template interpolation and prevents cache key drift.
 */
export const AuthRateLimitKeys = {
   /**
    * Constructs a sliding window counter key under the rate_limit namespace.
    */
   windowCounter: buildWindowCounterKey,

   /**
    * Constructs a pattern for wildcard match/deletion under the rate_limit namespace.
    */
   pattern: buildWildcardPattern,

   /**
    * Legacy key pattern for raw Redis operations without namespace manager.
    */
   legacyWindowCounter: buildLegacyRateLimitKey,

   /**
    * Legacy pattern for wildcard match/deletion with raw Redis.
    */
   legacyPattern: buildLegacyRateLimitPattern,

   /**
    * Login rate limit key builder.
    */
   login: (email: string, ip: string): string => joinKeySegments(AUTH_RATE_LIMIT_CONFIG.LOGIN.keyPrefix, email, ip),

   /**
    * Send register OTP rate limit key builder.
    */
   sendRegisterOtp: (email: string): string =>
      joinKeySegments(AUTH_RATE_LIMIT_CONFIG.SEND_REGISTER_OTP.keyPrefix, email),

   /**
    * Verify register OTP rate limit key builder.
    */
   verifyRegisterOtp: (email: string): string =>
      joinKeySegments(AUTH_RATE_LIMIT_CONFIG.VERIFY_REGISTER_OTP.keyPrefix, email),

   /**
    * Change password rate limit key builder.
    */
   changePassword: (accountId: string): string =>
      joinKeySegments(AUTH_RATE_LIMIT_CONFIG.CHANGE_PASSWORD.keyPrefix, accountId),

   /**
    * Verify change password OTP rate limit key builder.
    */
   verifyChangePasswordOtp: (accountId: string): string =>
      joinKeySegments(AUTH_RATE_LIMIT_CONFIG.VERIFY_CHANGE_PASSWORD_OTP.keyPrefix, accountId),

   /**
    * Refresh token rate limit key builder.
    */
   refreshToken: (accountId: string): string =>
      joinKeySegments(AUTH_RATE_LIMIT_CONFIG.REFRESH_TOKEN.keyPrefix, accountId),

   /**
    * Check email availability rate limit key builder.
    */
   checkEmail: (email: string): string => joinKeySegments(AUTH_RATE_LIMIT_CONFIG.CHECK_EMAIL.keyPrefix, email),
} as const;
