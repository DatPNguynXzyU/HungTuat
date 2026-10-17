import type { CacheNamespace } from '@common/cache/cache-namespace.enum';
import type { CacheHealthState } from '@common/constants/health.constant';

/**
 * Entry structure for batch operations (mset) with optional per-key TTL.
 */
export interface CacheEntry<T = unknown> {
   key: string;
   value: T;
   ttl?: number;
}

/**
 * Result representation for Redis health check probe.
 */
export interface CacheHealthStatus {
   status: CacheHealthState;
   latency?: number;
   message?: string;
}

/**
 * Interface contract for CacheService adhering to Dependency Inversion and clean architecture.
 */
export interface ICacheService {
   /**
    * Retrieves and parses a value from the cache under the specified namespace.
    */
   get<T = string>(namespace: CacheNamespace, key: string): Promise<T | null>;

   /**
    * Stores a value in the cache under the specified namespace with an optional TTL.
    */
   set<T = unknown>(namespace: CacheNamespace, key: string, value: T, ttlSeconds?: number): Promise<void>;

   /**
    * Deletes a key under the specified namespace.
    */
   delete(namespace: CacheNamespace, key: string): Promise<boolean>;

   /**
    * Alias for delete().
    */
   del(namespace: CacheNamespace, key: string): Promise<boolean>;

   /**
    * Checks if a key exists under the specified namespace.
    */
   exists(namespace: CacheNamespace, key: string): Promise<boolean>;

   /**
    * Retrieves multiple keys under the specified namespace in a single round-trip.
    */
   mget<T = string>(namespace: CacheNamespace, keys: string[]): Promise<(T | null)[]>;

   /**
    * Sets multiple key-value pairs under the specified namespace using pipelining.
    */
   mset(namespace: CacheNamespace, entries: CacheEntry<unknown>[]): Promise<void>;

   /**
    * Gets the remaining TTL in seconds for a key under the specified namespace.
    */
   getTTL(namespace: CacheNamespace, key: string): Promise<number>;

   /**
    * Extends the TTL of an existing key by additional seconds.
    */
   extendTTL(namespace: CacheNamespace, key: string, additionalSeconds: number): Promise<boolean>;

   /**
    * Sets expiration time for a key to an absolute Unix timestamp or Date object.
    */
   setExpireAt(namespace: CacheNamespace, key: string, timestamp: number | Date): Promise<boolean>;

   /**
    * Deletes all keys matching a pattern within the specified namespace.
    */
   deleteByPattern(namespace: CacheNamespace, pattern: string): Promise<number>;

   /**
    * Increments the number stored at key by one under the specified namespace.
    */
   incr(namespace: CacheNamespace, key: string): Promise<number>;

   /**
    * Sets a timeout on key under the specified namespace.
    */
   expire(namespace: CacheNamespace, key: string, ttlSeconds: number): Promise<void>;

   /**
    * Executes a health probe verifying connectivity and measuring ping latency.
    */
   healthCheck(timeoutMs?: number): Promise<CacheHealthStatus>;
}
