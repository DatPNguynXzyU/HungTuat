export const AUTH_COOKIES = {
   ACCESS_TOKEN: 'access_token',
   REFRESH_TOKEN: 'refresh_token',
} as const;

export const USER_STATUS = {
   ACTIVE: 'ACTIVE',
   INACTIVE: 'INACTIVE',
   BLOCKED: 'BLOCKED',
   SUSPENDED: 'SUSPENDED',
   PENDING: 'PENDING',
} as const;

export const AUTH_PATTERNS = {
   REGISTER: 'auth.register',
   LOGIN: 'auth.login',
   REFRESH_TOKEN: 'auth.refresh_token',
   REVOKE_TOKEN: 'auth.revoke_token',
   REVOKE_ALL_USER_TOKENS: 'auth.revoke_all_user_tokens',
   LOGOUT_ALL: 'auth.logout_all',
   CHANGE_PASSWORD: 'auth.change_password',
   VALIDATE_TOKEN: 'auth.validate_token',
   GET_ROLE_PERMISSIONS: 'auth.get_role_permissions',
} as const;

export const AUTH_SECURITY = {
   MAX_FAILED_LOGIN_ATTEMPTS: 5,
   LOCKOUT_DURATION_SECONDS: 900, // 15 minutes in seconds
   FAILED_ATTEMPTS_TTL_SECONDS: 900, // 15 minutes window
} as const;

export type AuthCookieName = (typeof AUTH_COOKIES)[keyof typeof AUTH_COOKIES];
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
