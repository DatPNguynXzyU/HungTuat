export const USER_REDIS_KEY_PREFIX = {
   BLOOM_USERNAME: 'user:bloom:username',
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
    * Redis key marking whether a specific user bloom filter has been hydrated.
    * Pattern: `user:bloom:initialized:<filterName>`
    */
   bloomInitialized: (filterName = 'username'): string => `${USER_REDIS_KEY_PREFIX.BLOOM_INITIALIZED}${filterName}`,

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
