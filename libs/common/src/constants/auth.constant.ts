export const AUTH_COOKIES = {
   ACCESS_TOKEN: 'access_token',
   REFRESH_TOKEN: 'refresh_token',
} as const;

export const AUTH_PATTERNS = {
   REGISTER: 'auth.register',
   LOGIN: 'auth.login',
   REFRESH_TOKEN: 'auth.refresh_token',
   REVOKE_TOKEN: 'auth.revoke_token',
   VALIDATE_TOKEN: 'auth.validate_token',
   GET_ROLE_PERMISSIONS: 'auth.get_role_permissions',
} as const;

export type AuthCookieName = (typeof AUTH_COOKIES)[keyof typeof AUTH_COOKIES];
export type AuthPattern = (typeof AUTH_PATTERNS)[keyof typeof AUTH_PATTERNS];
