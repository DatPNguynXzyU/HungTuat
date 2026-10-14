export const REDIS_KEY_PREFIX = {
   ROLE: 'rbac:role:',
   ROLE_PERMISSIONS: 'rbac:role_permissions:',
   REFRESH_TOKEN: 'auth:refresh_token:',
   USER_SESSIONS: 'auth:account_sessions:',
   ACCOUNT_SESSIONS: 'auth:account_sessions:',
   REVOKED_TOKEN: 'auth:revoked_token:',
   USER_REVOKED_AT: 'auth:account_revoked_at:',
   ACCOUNT_REVOKED_AT: 'auth:account_revoked_at:',
   FAILED_LOGIN_ATTEMPTS: 'auth:failed_attempts:',
   LOCKOUT: 'auth:lockout:',
   BLOOM_EMAIL: 'auth:bloom:email',
   BLOOM_USERNAME: 'user:bloom:username',
   BLOOM_INITIALIZED: 'auth:bloom:initialized:',
   OTP_REGISTER: 'auth:otp:register:',
   OTP_REGISTER_ATTEMPTS: 'auth:otp_attempts:register:',
   OTP_REGISTER_COOLDOWN: 'auth:otp_cooldown:register:',
   OTP_VERIFICATION_TOKEN: 'auth:otp_verification_token:',
   OTP_CHANGE_PASSWORD: 'auth:otp:change_password:',
   OTP_CHANGE_PASSWORD_ATTEMPTS: 'auth:otp_attempts:change_password:',
   OTP_CHANGE_PASSWORD_COOLDOWN: 'auth:otp_cooldown:change_password:',
   THREAT_METRICS: 'auth:threat:metrics:',
   THREAT_IPS: 'auth:threat:ips:',
   THREAT_REASONS: 'auth:threat:reasons:',
} as const;

export const REDIS_TTL = {
   DEFAULT_ROLE: 86400 * 7, // 7 days in seconds
   ROLE_PERMISSIONS: 86400 * 7, // 7 days in seconds
   AUTH_LOCKOUT: 900, // 15 minutes in seconds
   AUTH_FAILED_ATTEMPTS: 900, // 15 minutes window
   BLOOM_INITIALIZED: 86400 * 30, // 30 days
   OTP_EXPIRES: 300, // 5 minutes in seconds
   OTP_COOLDOWN: 60, // 60 seconds
   OTP_REGISTER: 300, // 5 minutes in seconds
   OTP_REGISTER_COOLDOWN: 60, // 60 seconds
   OTP_VERIFICATION_TOKEN: 900, // 15 minutes in seconds
   OTP_CHANGE_PASSWORD_EXPIRES: 600, // 10 minutes in seconds
   OTP_CHANGE_PASSWORD_COOLDOWN: 60, // 60 seconds
   THREAT_METRICS: 86400 * 7, // 7 days in seconds
} as const;
