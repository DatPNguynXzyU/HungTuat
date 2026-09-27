export const REDIS_KEY_PREFIX = {
   ROLE: 'rbac:role:',
   ROLE_PERMISSIONS: 'rbac:role_permissions:',
   REFRESH_TOKEN: 'auth:refresh_token:',
   REVOKED_TOKEN: 'auth:revoked_token:',
} as const;

export const REDIS_TTL = {
   DEFAULT_ROLE: 86400 * 7, // 7 days in seconds
   ROLE_PERMISSIONS: 86400 * 7, // 7 days in seconds
} as const;
