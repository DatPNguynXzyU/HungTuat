import { AUTH_ERROR_CODES, type AuthErrorCode } from '@common';

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
