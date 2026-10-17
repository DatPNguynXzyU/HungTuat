export const USER_REDIS_KEY_PREFIX = {
   BLOOM_USERNAME: 'user:bloom:username',
   BLOOM_USERNAME_TEMP: 'user:bloom:username:temp',
   BLOOM_INITIALIZED: 'user:bloom:initialized:',
   PROFILE_PROJECTION: 'user:projection:profile:',
   ACTIVITY_PROJECTION: 'user:projection:activity:',
} as const;

export type UserRedisKeyPrefix = (typeof USER_REDIS_KEY_PREFIX)[keyof typeof USER_REDIS_KEY_PREFIX];

export const USER_REDIS_TTL = {
   BLOOM_INITIALIZED: 86400 * 30, // 30 days in seconds
   PROFILE_PROJECTION: 86400 * 7, // 7 days in seconds
   ACTIVITY_PROJECTION: 86400 * 30, // 30 days in seconds
} as const;

export type UserRedisTtl = (typeof USER_REDIS_TTL)[keyof typeof USER_REDIS_TTL];

export const USER_REDIS_FLAGS = {
   INITIALIZED: '1',
} as const;

export const BLOOM_FILTER_NAMES = {
   USERNAME: 'username',
} as const;

/**
 * Standard key builder utilities for User domain Redis caching.
 * Prevents key collision and eliminates string interpolation duplication.
 */
export const UserRedisKeys = {
   /**
    * Redis bitset key storing the username Bloom filter for O(1) non-existence checks.
    * Key: `user:bloom:username`
    */
   bloomUsername: (): string => USER_REDIS_KEY_PREFIX.BLOOM_USERNAME,

   /**
    * Redis temporary bitset key for atomic shadow swap during filter rebuilding.
    * Key: `user:bloom:username:temp`
    */
   bloomUsernameTemp: (): string => USER_REDIS_KEY_PREFIX.BLOOM_USERNAME_TEMP,

   /**
    * Redis key marking whether the username bloom filter has been hydrated from database.
    * Key: `user:bloom:initialized:username`
    */
   bloomUsernameInitialized: (): string => `${USER_REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${BLOOM_FILTER_NAMES.USERNAME}`,

   /**
    * Redis key marking whether a specific user bloom filter has been hydrated.
    * Pattern: `user:bloom:initialized:<filterName>`
    */
   bloomInitialized: (filterName: string = BLOOM_FILTER_NAMES.USERNAME): string =>
      `${USER_REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${filterName}`,

   /**
    * Redis key for denormalized user profile read model projection.
    * Pattern: `user:projection:profile:<userId>`
    */
   profileProjection: (userId: string): string => `${USER_REDIS_KEY_PREFIX.PROFILE_PROJECTION}${userId}`,

   /**
    * Redis key for user activity summary projection.
    * Pattern: `user:projection:activity:<userId>`
    */
   activityProjection: (userId: string): string => `${USER_REDIS_KEY_PREFIX.ACTIVITY_PROJECTION}${userId}`,
} as const;
