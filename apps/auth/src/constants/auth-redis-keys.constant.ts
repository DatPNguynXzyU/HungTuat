export const AUTH_REDIS_KEY_PREFIX = {
   REFRESH_TOKEN: 'auth:refresh_token:',
   USER_SESSIONS: 'auth:account_sessions:',
   ACCOUNT_SESSIONS: 'auth:account_sessions:',
   REVOKED_TOKEN: 'auth:revoked_token:',
   USER_REVOKED_AT: 'auth:account_revoked_at:',
   ACCOUNT_REVOKED_AT: 'auth:account_revoked_at:',
   FAILED_LOGIN_ATTEMPTS: 'auth:failed_attempts:',
   LOCKOUT: 'auth:lockout:',
   BLOOM_EMAIL: 'auth:bloom:email',
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

export type AuthRedisKeyPrefix = (typeof AUTH_REDIS_KEY_PREFIX)[keyof typeof AUTH_REDIS_KEY_PREFIX];

export const AUTH_REDIS_TTL = {
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

export type AuthRedisTtl = (typeof AUTH_REDIS_TTL)[keyof typeof AUTH_REDIS_TTL];

/**
 * Single source of truth for all Redis cache and state keys within the Auth service.
 * Eliminates string template interpolation duplication and enforces consistent key structures.
 */
export const AuthRedisKeys = {
   /**
    * Redis JSON key storing the active session metadata for an account's refresh token.
    *
    * Pattern: `auth:refresh_token:<accountId>:<jti>`
    * @example
    * ```ts
    * AuthRedisKeys.refreshToken('acc_018f3a5b', 'jti_987654')
    * // => "auth:refresh_token:acc_018f3a5b:jti_987654"
    * ```
    */
   refreshToken: (accountId: string, jti: string): string =>
      `${AUTH_REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:${jti}`,

   /**
    * Redis scan/delete pattern matching all active refresh tokens belonging to an account.
    *
    * Pattern: `auth:refresh_token:<accountId>:*`
    * @example
    * ```ts
    * AuthRedisKeys.refreshTokenPattern('acc_018f3a5b')
    * // => "auth:refresh_token:acc_018f3a5b:*"
    * ```
    */
   refreshTokenPattern: (accountId: string): string => `${AUTH_REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:*`,

   /**
    * Redis Set key storing all active refresh token JTIs for an account session list.
    *
    * Pattern: `auth:account_sessions:<accountId>`
    * @example
    * ```ts
    * AuthRedisKeys.sessions('acc_018f3a5b')
    * // => "auth:account_sessions:acc_018f3a5b"
    * ```
    */
   sessions: (accountId: string): string => `${AUTH_REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${accountId}`,

   /**
    * Redis key for blacklisted / revoked individual tokens (access or refresh token JTI).
    *
    * Pattern: `auth:revoked_token:<jti>`
    * @example
    * ```ts
    * AuthRedisKeys.revokedToken('jti_987654')
    * // => "auth:revoked_token:jti_987654"
    * ```
    */
   revokedToken: (jti: string): string => `${AUTH_REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`,

   /**
    * Redis key storing the Unix timestamp before which all issued tokens for this account are invalidated.
    *
    * Pattern: `auth:account_revoked_at:<accountId>`
    * @example
    * ```ts
    * AuthRedisKeys.accountRevokedAt('acc_018f3a5b')
    * // => "auth:account_revoked_at:acc_018f3a5b"
    * ```
    */
   accountRevokedAt: (accountId: string): string => `${AUTH_REDIS_KEY_PREFIX.ACCOUNT_REVOKED_AT}${accountId}`,

   /**
    * Redis key flagging temporary lockout when an account exceeds max failed login attempts.
    *
    * Pattern: `auth:lockout:<email>:<clientIp>`
    * @example
    * ```ts
    * AuthRedisKeys.lockout('user@example.com', '192.168.1.100')
    * // => "auth:lockout:user@example.com:192.168.1.100"
    * ```
    */
   lockout: (email: string, clientIp: string): string => `${AUTH_REDIS_KEY_PREFIX.LOCKOUT}${email}:${clientIp}`,

   /**
    * Redis counter key tracking sliding window failed login attempts.
    *
    * Pattern: `auth:failed_attempts:<email>:<clientIp>`
    * @example
    * ```ts
    * AuthRedisKeys.failedAttempts('user@example.com', '192.168.1.100')
    * // => "auth:failed_attempts:user@example.com:192.168.1.100"
    * ```
    */
   failedAttempts: (email: string, clientIp: string): string =>
      `${AUTH_REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}${email}:${clientIp}`,

   /**
    * Redis key storing the active OTP code sent during user registration.
    *
    * Pattern: `auth:otp:register:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.registerOtp('user@example.com')
    * // => "auth:otp:register:user@example.com"
    * ```
    */
   registerOtp: (email: string): string => `${AUTH_REDIS_KEY_PREFIX.OTP_REGISTER}${email}`,

   /**
    * Redis counter key tracking invalid registration OTP verification attempts.
    *
    * Pattern: `auth:otp_attempts:register:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.registerOtpAttempts('user@example.com')
    * // => "auth:otp_attempts:register:user@example.com"
    * ```
    */
   registerOtpAttempts: (email: string): string => `${AUTH_REDIS_KEY_PREFIX.OTP_REGISTER_ATTEMPTS}${email}`,

   /**
    * Redis key enforcing cooldown between consecutive registration OTP requests.
    *
    * Pattern: `auth:otp_cooldown:register:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.registerOtpCooldown('user@example.com')
    * // => "auth:otp_cooldown:register:user@example.com"
    * ```
    */
   registerOtpCooldown: (email: string): string => `${AUTH_REDIS_KEY_PREFIX.OTP_REGISTER_COOLDOWN}${email}`,

   /**
    * Redis JSON key storing pending password change OTP payload (code, hash, logoutAll).
    *
    * Pattern: `auth:otp:change_password:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.changePasswordOtp('user@example.com')
    * // => "auth:otp:change_password:user@example.com"
    * ```
    */
   changePasswordOtp: (email: string): string => `${AUTH_REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}${email}`,

   /**
    * Redis counter key tracking invalid password change OTP attempts.
    *
    * Pattern: `auth:otp_attempts:change_password:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.changePasswordOtpAttempts('user@example.com')
    * // => "auth:otp_attempts:change_password:user@example.com"
    * ```
    */
   changePasswordOtpAttempts: (email: string): string =>
      `${AUTH_REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_ATTEMPTS}${email}`,

   /**
    * Redis key enforcing cooldown between consecutive password change OTP requests.
    *
    * Pattern: `auth:otp_cooldown:change_password:<email>`
    * @example
    * ```ts
    * AuthRedisKeys.changePasswordOtpCooldown('user@example.com')
    * // => "auth:otp_cooldown:change_password:user@example.com"
    * ```
    */
   changePasswordOtpCooldown: (email: string): string =>
      `${AUTH_REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_COOLDOWN}${email}`,

   /**
    * Redis key storing the single-use registration verification token consumed on final submit.
    *
    * Pattern: `auth:otp_verification_token:<token>`
    * @example
    * ```ts
    * AuthRedisKeys.verificationToken('vtok_018f3a5b6c7d')
    * // => "auth:otp_verification_token:vtok_018f3a5b6c7d"
    * ```
    */
   verificationToken: (token: string): string => `${AUTH_REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`,

   /**
    * Redis key marking whether the email Bloom filter has been hydrated from PostgreSQL.
    *
    * Key: `auth:bloom:initialized:email`
    * @example
    * ```ts
    * AuthRedisKeys.bloomEmailInitialized()
    * // => "auth:bloom:initialized:email"
    * ```
    */
   bloomEmailInitialized: (): string => `${AUTH_REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${AUTH_BLOOM_FILTERS.EMAIL}`,

   /**
    * Redis key marking whether a specific bloom filter has been hydrated from PostgreSQL.
    *
    * Pattern: `auth:bloom:initialized:<name>`
    * @example
    * ```ts
    * AuthRedisKeys.bloomInitialized(AUTH_BLOOM_FILTERS.EMAIL)
    * // => "auth:bloom:initialized:email"
    * ```
    */
   bloomInitialized: (name: string = AUTH_BLOOM_FILTERS.EMAIL): string =>
      `${AUTH_REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${name}`,

   /**
    * Redis bitset key storing the email Bloom filter for O(1) non-existence checks.
    *
    * Key: `auth:bloom:email`
    * @example
    * ```ts
    * AuthRedisKeys.bloomEmail()
    * // => "auth:bloom:email"
    * ```
    */
   bloomEmail: (): string => AUTH_REDIS_KEY_PREFIX.BLOOM_EMAIL,

   /**
    * Redis hash key storing daily threat metrics (totalFailedLogins, uniqueLockedAccounts).
    *
    * Pattern: `auth:threat:metrics:<date>`
    * @example
    * ```ts
    * AuthRedisKeys.threatMetrics('2026-10-14')
    * // => "auth:threat:metrics:2026-10-14"
    * ```
    */
   threatMetrics: (date: string): string => `${AUTH_REDIS_KEY_PREFIX.THREAT_METRICS}${date}`,

   /**
    * Redis Sorted Set key tracking suspicious client IP addresses and their incident frequencies for a given date.
    *
    * Pattern: `auth:threat:ips:<date>`
    * @example
    * ```ts
    * AuthRedisKeys.threatIps('2026-10-14')
    * // => "auth:threat:ips:2026-10-14"
    * ```
    */
   threatIps: (date: string): string => `${AUTH_REDIS_KEY_PREFIX.THREAT_IPS}${date}`,

   /**
    * Redis hash key storing failure reason frequencies for a given date.
    *
    * Pattern: `auth:threat:reasons:<date>`
    * @example
    * ```ts
    * AuthRedisKeys.threatReasons('2026-10-14')
    * // => "auth:threat:reasons:2026-10-14"
    * ```
    */
   threatReasons: (date: string): string => `${AUTH_REDIS_KEY_PREFIX.THREAT_REASONS}${date}`,
} as const;

/**
 * Standard Bloom filter identifiers across the Auth domain.
 */
export const AUTH_BLOOM_FILTERS = {
   EMAIL: 'email',
} as const;

export type AuthBloomFilter = (typeof AUTH_BLOOM_FILTERS)[keyof typeof AUTH_BLOOM_FILTERS];

/**
 * Standard Redis Hash field names for daily threat metrics tracking.
 */
export const THREAT_METRICS_FIELDS = {
   TOTAL_FAILED_LOGINS: 'totalFailedLogins',
   UNIQUE_LOCKED_ACCOUNTS: 'uniqueLockedAccounts',
} as const;

export type ThreatMetricsField = (typeof THREAT_METRICS_FIELDS)[keyof typeof THREAT_METRICS_FIELDS];
