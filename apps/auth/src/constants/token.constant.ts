export const TOKEN_REVOCATION_VALUE = 'revoked' as const;

export const TOKEN_STATUS = {
   ACTIVE: 'active',
   REVOKED: 'revoked',
} as const;

export type TokenStatus = (typeof TOKEN_STATUS)[keyof typeof TOKEN_STATUS];
