export const DEFAULT_JWT_KEY_ID = 'omni-auth-key-1';

export const JWT_ALGORITHM = {
   ES256: 'ES256',
   RS256: 'RS256',
} as const;

export type JwtAlgorithm = (typeof JWT_ALGORITHM)[keyof typeof JWT_ALGORITHM];

export const DEFAULT_JWT_ALGORITHM = JWT_ALGORITHM.ES256;
export const SUPPORTED_JWT_ALGORITHMS = [JWT_ALGORITHM.ES256, JWT_ALGORITHM.RS256] as const;
export type SupportedJwtAlgorithm = (typeof SUPPORTED_JWT_ALGORITHMS)[number];

export const JWT_TOKEN_TYPE = {
   ACCESS: 'access',
   REFRESH: 'refresh',
} as const;

export type JwtTokenType = (typeof JWT_TOKEN_TYPE)[keyof typeof JWT_TOKEN_TYPE];

export const AUTH_COOKIES = {
   ACCESS_TOKEN: 'access_token',
   REFRESH_TOKEN: 'refresh_token',
} as const;

export const AUTH_ERROR_REASONS = {
   EMAIL_REQUIRED: 'email_required',
   REFRESH_TOKEN_MISSING: 'refresh_token_missing',
   TOKEN_MISSING: 'token_missing',
   TOKEN_REVOKED: 'token_revoked',
   TOKEN_INVALID_OR_EXPIRED: 'token_invalid_or_expired',
   INVALID_TOKEN_TYPE: 'invalid_token_type',
   USER_TOKENS_REVOKED: 'user_tokens_revoked',
   USER_NOT_AUTHENTICATED: 'user_not_authenticated',
   INSUFFICIENT_ROLE: 'insufficient_role',
   INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
} as const;

export type AuthCookie = (typeof AUTH_COOKIES)[keyof typeof AUTH_COOKIES];
export type AuthErrorReason = (typeof AUTH_ERROR_REASONS)[keyof typeof AUTH_ERROR_REASONS];

/**
 * Default NIST P-256 (prime256v1 / secp256r1) EC Private Key (PKCS#8 PEM) for development and tests.
 */
export const DEFAULT_DEV_EC_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg0VmXM4qElaZYtAzU
1sGoPWlpgHEjMUAjCL45o95V33ShRANCAAR2SDmgBI30jDoKwdk2VoSn4vK26f4m
xviwGK7eGU+CYcPML5Y5zKCVvaNcJM5BAyYXgRyqj/6sp9vGm80y9siH
-----END PRIVATE KEY-----`;

/**
 * Default NIST P-256 (prime256v1 / secp256r1) EC Public Key (SPKI PEM) for development and tests.
 */
export const DEFAULT_DEV_EC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEdkg5oASN9Iw6CsHZNlaEp+Lytun+
Jsb4sBiu3hlPgmHDzC+WOcyglb2jXCTOQQMmF4Ecqo/+rKfbxpvNMvbIhw==
-----END PUBLIC KEY-----`;

/**
 * Default dev key aliases pointing to the primary ECDSA key pair.
 */
export const DEFAULT_DEV_PRIVATE_KEY = DEFAULT_DEV_EC_PRIVATE_KEY;
export const DEFAULT_DEV_PUBLIC_KEY = DEFAULT_DEV_EC_PUBLIC_KEY;

/**
 * Legacy RSA-2048 Private Key retained for backward compatibility & zero-downtime transition tests.
 */
export const DEFAULT_DEV_RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCx/CvjH0K6nAfI
yEh2cMhJrYyMrmmXgKA39rKdH43qihXS9a155y/TRBKQ/3xe+pVOBNOCh7Nbx+vS
Ourtl5B0Y8pJmllZhA3ZF8uz/KFE+jlSFg1kMxaIDgmHcL85ZyRv9d2VWaQ49pd3
lLZ6Rmh1jbnaaYC8ZmK4ZBb0G+Sma0Icvzom1ocQbvWjbSVvFMa4uTjOX5MkFQBj
JWjLRpONVBBdDxY5WthW82tJuOPR3y9GSA4lywjTwQUXiacdCcSpcZDiNPQ5lT5g
j1MIuO8fSKC5Q5lX62V07L1/6ojHI7IR9UJHykPXrzfIvk/wz+NpVRauRwHd9BDn
tRKOhSU1AgMBAAECggEAA+s8gCS5EGjNFxOp3MnA7zZeCN7yPj67yF+rMSB3vHlL
37g/GJcJi4pNKlolv+WekfgzPAWG4nd1bsyTTaXvrVBhLNu0Ke9paqVGe/END/q+
dls78j/ZuCcu+Id3/miR+dEdDuPJZOOxFBX3KpwQQr5bID8AcaWDePHjO369uxhK
E7nUDWbBDrRVN1nWo4nS9vh8fuGmaDIQZaGsAB52ifjWJa4N/oTUulhIkQbiD0ci
RTiQTcUxbPx9lu4Qr/Jnn/mDXxjnHUXa4pa0mXBjfO60jVqpQ2orifx71TDSnXp0
3e2q9HQh0Gljrw3IAecqWk5r6f8OARvtGJjB+7PlhQKBgQDg0yp3vJWJcwXpRGIZ
onHYLqzvv7bYxQsooZITSZ3qTjsj20jYf39F5HdgNJNCoE0XDRffhAKVlLjmSTJ4
OQ6jvhPYUi7b2UO9BdvmA8/Ua6JrF0jsyh5TshjI/Om8cYgJeMQ+2qMR7SN3wTU2
bCzJ2EGPK7/SgL6Z9fmyOj8yjwKBgQDKqkkLpNU49xwRN6YaR6z0bh1pR8I5PtgQ
OdiWpwJ9huGNJanp4zmN+xY6Cmw5Bsft7/K0sXvz1dfwyF6zxGLPmWEHwXjXPHzD
zbvoeDpexQA/M8VXj9piGWYr67ws9+x+1tWrO6QK96NUFi2L0zLBT6cYBf45zVfY
bQ56U5W9+wKBgQC52PVPG35Fq+akCJpLdIRFX3gni8Q7ds8dnEojVYSLrnWm01tp
VCPCg/TGe0+MEPUI7BLi+r4kJleeTb3BsfDPHI5NEMqZhAVB2PkJL/d6MiuF+S6Y
RxBAwYVJiAAzfWol4kXfa17Hr87U7MrvHQb9J54yGskr2q80mCf707hwMwKBgCEo
2YjJMIYAkJwUkd3s6lSYC8HlFtdM/Aczn8eOje7B+fehOPrmzcz4Tzux5uExxdad
kwWToKdVzt47upsJP+2dt+2P71iwMe3LpLo1qb9F1nOA4gIgrGeupjP7fy+QZSaf
uhgpSv7sY9HnSw58wOo2QS3CFUWZ3oyv01WahX6vAoGBALjgz8UzvDZnMNZAu14Y
K0B0uDfZk2ik2plKXdfKyquqv3FBl/DTp4izLYTK5LlLolUe1Vb7SCcuf7lO5Bgh
VW+SefGub+D1mr+EOjDcKuYZ+BWGahisLGMyhhpbHmUY2TT/6n1QyvEZaNTJjN9L
lgw10Sms31Q1T1wq1uLchk3v
-----END PRIVATE KEY-----`;

/**
 * Legacy RSA-2048 Public Key retained for backward compatibility & zero-downtime transition tests.
 */
export const DEFAULT_DEV_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsfwr4x9CupwHyMhIdnDI
Sa2MjK5pl4CgN/aynR+N6ooV0vWteecv00QSkP98XvqVTgTTgoezW8fr0jrq7ZeQ
dGPKSZpZWYQN2RfLs/yhRPo5UhYNZDMWiA4Jh3C/OWckb/XdlVmkOPaXd5S2ekZo
dY252mmAvGZiuGQW9BvkpmtCHL86JtaHEG71o20lbxTGuLk4zl+TJBUAYyVoy0aT
jVQQXQ8WOVrYVvNrSbjj0d8vRkgOJcsI08EFF4mnHQnEqXGQ4jT0OZU+YI9TCLjv
H0iguUOZV+tldOy9f+qIxyOyEfVCR8pD1683yL5P8M/jaVUWrkcB3fQQ57USjoUl
NQIDAQAB
-----END PUBLIC KEY-----`;
