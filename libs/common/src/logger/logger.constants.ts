export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';
export const LOG_ACTION_KEY = 'log_action';

export const SENSITIVE_LOG_KEYS = [
   'password',
   'currentPassword',
   'newPassword',
   'confirmPassword',
   'token',
   'refreshToken',
   'accessToken',
   'secret',
   'apiKey',
   'otp',
] as const;
