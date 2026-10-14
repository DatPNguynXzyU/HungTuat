export const AUTH_METRICS_PREFIX = 'auth_';

export const AUTH_METRICS_NAMES = {
   LOGIN_ATTEMPTS: 'auth_login_attempts_total',
   REGISTRATION_ATTEMPTS: 'auth_registration_attempts_total',
   TOKEN_OPERATIONS: 'auth_token_operations_total',
   OTP_OPERATIONS: 'auth_otp_operations_total',
   SESSION_OPERATIONS: 'auth_session_operations_total',
   ACTIVE_SESSIONS: 'auth_active_sessions_total',
   LOCKED_ACCOUNTS: 'auth_locked_accounts_total',
   OUTBOX_PENDING: 'auth_outbox_pending_events_total',
   TOKEN_GENERATION_DURATION: 'auth_token_generation_duration_seconds',
   LOGIN_DURATION: 'auth_login_duration_seconds',
   PASSWORD_HASH_DURATION: 'auth_password_hash_duration_seconds',
   OTP_OPERATION_DURATION: 'auth_otp_operation_duration_seconds',
} as const;

export const AUTH_METRICS_HELP = {
   LOGIN_ATTEMPTS: 'Total number of login attempts',
   REGISTRATION_ATTEMPTS: 'Total number of registration attempts',
   TOKEN_OPERATIONS: 'Total number of token operations',
   OTP_OPERATIONS: 'Total number of OTP operations',
   SESSION_OPERATIONS: 'Total number of session operations',
   ACTIVE_SESSIONS: 'Current number of active sessions',
   LOCKED_ACCOUNTS: 'Current number of locked accounts',
   OUTBOX_PENDING: 'Current number of pending outbox events',
   TOKEN_GENERATION_DURATION: 'Duration of token generation operations',
   LOGIN_DURATION: 'Duration of login operations',
   PASSWORD_HASH_DURATION: 'Duration of password hashing operations',
   OTP_OPERATION_DURATION: 'Duration of OTP operations',
} as const;

export const AUTH_METRICS_LABELS = {
   STATUS: 'status',
   REASON: 'reason',
   OPERATION: 'operation',
   TYPE: 'type',
} as const;

export const AUTH_METRICS_BUCKETS: {
   readonly TOKEN_GENERATION: number[];
   readonly LOGIN_DURATION: number[];
   readonly PASSWORD_HASH: number[];
   readonly OTP_OPERATION: number[];
} = {
   // Token generation: 1ms to 1s (typically < 50ms for JWT signing)
   TOKEN_GENERATION: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],

   // Login duration: 100ms to 10s (includes DB query + password hash)
   LOGIN_DURATION: [0.1, 0.5, 1, 2, 5, 10],

   // Password hashing: 100ms to 5s (bcrypt/argon2 intentionally slow)
   PASSWORD_HASH: [0.1, 0.5, 1, 2, 5],

   // OTP operations: 100ms to 5s (includes email sending)
   OTP_OPERATION: [0.1, 0.5, 1, 2, 5],
};

export const AUTH_METRICS_STATUS = {
   SUCCESS: 'success',
   FAILURE: 'failure',
} as const;
export type AuthMetricStatus = (typeof AUTH_METRICS_STATUS)[keyof typeof AUTH_METRICS_STATUS];

export const AUTH_METRICS_DEFAULT_REASON = 'none';

export const AUTH_METRICS_REASONS = {
   INVALID_CREDENTIALS: 'invalid_credentials',
   ACCOUNT_LOCKED: 'account_locked',
   EMAIL_EXISTS: 'email_exists',
   USER_NOT_FOUND: 'user_not_found',
   INVALID_OTP: 'invalid_otp',
   OTP_EXPIRED: 'otp_expired',
   UNKNOWN: 'unknown',
   NONE: 'none',
} as const;
export type AuthMetricReason = (typeof AUTH_METRICS_REASONS)[keyof typeof AUTH_METRICS_REASONS];

export const AUTH_METRICS_TOKEN_OPERATIONS = {
   GENERATE: 'generate',
   REFRESH: 'refresh',
   REVOKE: 'revoke',
} as const;
export type AuthMetricTokenOperation =
   (typeof AUTH_METRICS_TOKEN_OPERATIONS)[keyof typeof AUTH_METRICS_TOKEN_OPERATIONS];

export const AUTH_METRICS_TOKEN_TYPES = {
   ACCESS: 'access',
   REFRESH: 'refresh',
} as const;
export type AuthMetricTokenType = (typeof AUTH_METRICS_TOKEN_TYPES)[keyof typeof AUTH_METRICS_TOKEN_TYPES];

export const AUTH_METRICS_OTP_OPERATIONS = {
   SEND: 'send',
   VERIFY: 'verify',
} as const;
export type AuthMetricOtpOperation = (typeof AUTH_METRICS_OTP_OPERATIONS)[keyof typeof AUTH_METRICS_OTP_OPERATIONS];

export const AUTH_METRICS_OTP_TYPES = {
   REGISTER: 'register',
   PASSWORD_CHANGE: 'password_change',
} as const;
export type AuthMetricOtpType = (typeof AUTH_METRICS_OTP_TYPES)[keyof typeof AUTH_METRICS_OTP_TYPES];

export const AUTH_METRICS_SESSION_OPERATIONS = {
   REVOKE: 'revoke',
   REVOKE_OTHER: 'revoke_other',
   REVOKE_ALL: 'revoke_all',
} as const;
export type AuthMetricSessionOperation =
   (typeof AUTH_METRICS_SESSION_OPERATIONS)[keyof typeof AUTH_METRICS_SESSION_OPERATIONS];
