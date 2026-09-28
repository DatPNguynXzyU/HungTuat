export const REDIS_KEY_PREFIX = {
   ROLE: 'rbac:role:',
   ROLE_PERMISSIONS: 'rbac:role_permissions:',
   REFRESH_TOKEN: 'auth:refresh_token:',
   USER_SESSIONS: 'auth:user_sessions:',
   REVOKED_TOKEN: 'auth:revoked_token:',
   USER_REVOKED_AT: 'auth:user_revoked_at:',
   FAILED_LOGIN_ATTEMPTS: 'auth:failed_attempts:',
   LOCKOUT: 'auth:lockout:',
} as const;

export const REDIS_TTL = {
   DEFAULT_ROLE: 86400 * 7, // 7 days in seconds
   ROLE_PERMISSIONS: 86400 * 7, // 7 days in seconds
   AUTH_LOCKOUT: 900, // 15 minutes in seconds
   AUTH_FAILED_ATTEMPTS: 900, // 15 minutes window
} as const;
