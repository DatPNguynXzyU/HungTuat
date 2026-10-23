export const TOKEN_REVOCATION_VALUE = 'revoked' as const;

export const TOKEN_STATUS = {
   ACTIVE: 'active',
   REVOKED: 'revoked',
} as const;

export type TokenStatus = (typeof TOKEN_STATUS)[keyof typeof TOKEN_STATUS];

export const TOKEN_HASH_ALGORITHMS = {
   SHA256: 'sha256',
} as const;

export type TokenHashAlgorithm = (typeof TOKEN_HASH_ALGORITHMS)[keyof typeof TOKEN_HASH_ALGORITHMS];

export const REFRESH_TOKEN_HASH_ALGORITHM: TokenHashAlgorithm = TOKEN_HASH_ALGORITHMS.SHA256;
export const REFRESH_TOKEN_SECRET_BYTES = 32 as const;
export const REFRESH_TOKEN_HEX_LENGTH = 64 as const; // 32 bytes in hex
export const TOKEN_HASH_ENCODING = 'hex' as const;
export type TokenHashEncoding = typeof TOKEN_HASH_ENCODING;
