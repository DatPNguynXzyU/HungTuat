export const RBAC_REDIS_KEY_PREFIX = {
   ROLE: 'rbac:role:',
   ROLE_PERMISSIONS: 'rbac:role_permissions:',
} as const;

export type RbacRedisKeyPrefix = (typeof RBAC_REDIS_KEY_PREFIX)[keyof typeof RBAC_REDIS_KEY_PREFIX];

export const RBAC_REDIS_TTL = {
   DEFAULT_ROLE: 86400 * 7, // 7 days in seconds
   ROLE_PERMISSIONS: 86400 * 7, // 7 days in seconds
} as const;

export type RbacRedisTtl = (typeof RBAC_REDIS_TTL)[keyof typeof RBAC_REDIS_TTL];

/**
 * Single source of truth for constructing RBAC Redis keys.
 * Eliminates ad-hoc string template interpolation and prevents cache key drift.
 */
export const RbacRedisKeys = {
   /**
    * Redis key storing cached role metadata and permissions.
    * Pattern: `rbac:role:<roleCode>`
    */
   role: (roleCode: string): string => `${RBAC_REDIS_KEY_PREFIX.ROLE}${roleCode}`,

   /**
    * Redis key storing cached permissions list for a role.
    * Pattern: `rbac:role_permissions:<roleCode>`
    */
   rolePermissions: (roleCode: string): string => `${RBAC_REDIS_KEY_PREFIX.ROLE_PERMISSIONS}${roleCode}`,
} as const;

export const AUTH_REVOCATION_REDIS_KEY_PREFIX = {
   REVOKED_TOKEN: 'auth:revoked_token:',
   USER_REVOKED_AT: 'auth:account_revoked_at:',
   ACCOUNT_REVOKED_AT: 'auth:account_revoked_at:',
} as const;

export type AuthRevocationRedisKeyPrefix =
   (typeof AUTH_REVOCATION_REDIS_KEY_PREFIX)[keyof typeof AUTH_REVOCATION_REDIS_KEY_PREFIX];

/**
 * Key builders for JWT revocation checks executed by JwtAuthGuard across all microservices.
 */
export const AuthRevocationRedisKeys = {
   revokedToken: (jti: string): string => `${AUTH_REVOCATION_REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`,
   accountRevokedAt: (accountId: string): string =>
      `${AUTH_REVOCATION_REDIS_KEY_PREFIX.ACCOUNT_REVOKED_AT}${accountId}`,
} as const;
