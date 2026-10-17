import { Injectable, Logger } from '@nestjs/common';
import { CacheNamespace } from '@common/cache/cache-namespace.enum';
import type { CacheEntry, CacheHealthStatus, ICacheService } from '@common/cache/cache.interface';
import { RedisService } from '@common/redis/redis.service';

/**
 * High-level caching service providing type-safe namespace key isolation,
 * standardized serialization, TTL management, bulk operations, and health checks.
 *
 * @example
 * ```ts
 * // Set user profile with predefined TTL
 * await cacheService.set(CacheNamespace.USER, '123', userData, CACHE_TTL.USER_PROFILE);
 *
 * // Retrieve typed session data
 * const session = await cacheService.get<SessionData>(CacheNamespace.SESSION, 'token-jti');
 *
 * // Health check
 * const health = await cacheService.healthCheck();
 * ```
 */
@Injectable()
export class CacheService implements ICacheService {
   private readonly logger = new Logger(CacheService.name);

   constructor(private readonly redisService: RedisService) {}

   /**
    * Constructs a namespaced Redis key following the `{namespace}:{key}` pattern.
    * Prevents duplicate namespace prefixing if the key already includes it.
    */
   private getKey(namespace: CacheNamespace, key: string): string {
      const prefix = `${namespace}:`;
      return key.startsWith(prefix) ? key : `${prefix}${key}`;
   }

   /**
    * Serializes a value for Redis storage. Strings are stored as raw text,
    * while objects, numbers, booleans, and arrays are serialized as JSON.
    */
   private serialize<T>(value: T): string {
      if (typeof value === 'string') {
         return value;
      }
      return JSON.stringify(value);
   }

   /**
    * Deserializes a string value retrieved from Redis.
    * Intelligently parses JSON objects, arrays, and booleans while keeping plain strings intact.
    */
   private deserialize<T>(value: string): T {
      const trimmed = value.trim();
      if (trimmed === 'true') {
         return true as unknown as T;
      }
      if (trimmed === 'false') {
         return false as unknown as T;
      }
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
         try {
            return JSON.parse(trimmed) as T;
         } catch {
            return value as unknown as T;
         }
      }
      return value as unknown as T;
   }

   /**
    * Retrieves and parses a value from the cache under the specified namespace.
    *
    * @param namespace The domain namespace to isolate keys
    * @param key Key within the namespace
    * @returns The parsed value or null if not found
    */
   async get<T = string>(namespace: CacheNamespace, key: string): Promise<T | null> {
      const fullKey = this.getKey(namespace, key);
      const raw = await this.redisService.get(fullKey);
      if (raw === null || raw === undefined) {
         return null;
      }
      return this.deserialize<T>(raw);
   }

   /**
    * Stores a value in the cache under the specified namespace.
    *
    * @param namespace The domain namespace to isolate keys
    * @param key Key within the namespace
    * @param value The value to cache (strings or JSON-serializable objects)
    * @param ttlSeconds Optional time-to-live in seconds
    */
   async set<T = unknown>(namespace: CacheNamespace, key: string, value: T, ttlSeconds?: number): Promise<void> {
      const fullKey = this.getKey(namespace, key);
      const serialized = this.serialize(value);
      await this.redisService.set(fullKey, serialized, ttlSeconds);
   }

   /**
    * Deletes a key under the specified namespace.
    *
    * @param namespace The domain namespace
    * @param key Key within the namespace
    * @returns True if the key existed and was deleted
    */
   async delete(namespace: CacheNamespace, key: string): Promise<boolean> {
      const fullKey = this.getKey(namespace, key);
      const client = this.redisService.getClient();
      if (!client) {
         await this.redisService.del(fullKey);
         return true;
      }
      try {
         const count = await client.del(fullKey);
         return count > 0;
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache delete failed for key "${fullKey}": ${error.message}`);
         return false;
      }
   }

   /**
    * Alias for delete().
    */
   async del(namespace: CacheNamespace, key: string): Promise<boolean> {
      return this.delete(namespace, key);
   }

   /**
    * Checks if a key exists under the specified namespace.
    *
    * @param namespace The domain namespace
    * @param key Key within the namespace
    * @returns True if key exists
    */
   async exists(namespace: CacheNamespace, key: string): Promise<boolean> {
      const fullKey = this.getKey(namespace, key);
      const client = this.redisService.getClient();
      if (!client) return false;
      try {
         const count = await client.exists(fullKey);
         return count > 0;
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache exists failed for key "${fullKey}": ${error.message}`);
         return false;
      }
   }

   /**
    * Retrieves multiple keys under the specified namespace in a single round-trip.
    *
    * @param namespace The domain namespace
    * @param keys Array of keys within the namespace
    * @returns Array of values matching the input order
    */
   async mget<T = string>(namespace: CacheNamespace, keys: string[]): Promise<(T | null)[]> {
      if (!keys || keys.length === 0) return [];
      const client = this.redisService.getClient();
      if (!client) return keys.map(() => null);
      const fullKeys = keys.map((key) => this.getKey(namespace, key));
      try {
         const results = await client.mget(...fullKeys);
         return results.map((item) => {
            if (item === null || item === undefined) return null;
            return this.deserialize<T>(item);
         });
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache mget failed: ${error.message}`);
         return keys.map(() => null);
      }
   }

   /**
    * Sets multiple key-value pairs under the specified namespace using pipelining.
    *
    * @param namespace The domain namespace
    * @param entries Array of cache entries with key, value, and optional TTL
    */
   async mset(namespace: CacheNamespace, entries: CacheEntry<unknown>[]): Promise<void> {
      if (!entries || entries.length === 0) return;
      const client = this.redisService.getClient();
      if (!client) return;
      try {
         const pipeline = client.pipeline();
         for (const entry of entries) {
            const fullKey = this.getKey(namespace, entry.key);
            const serialized = this.serialize(entry.value);
            if (entry.ttl && entry.ttl > 0) {
               pipeline.set(fullKey, serialized, 'EX', entry.ttl);
            } else {
               pipeline.set(fullKey, serialized);
            }
         }
         await pipeline.exec();
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache mset failed: ${error.message}`);
      }
   }

   /**
    * Gets the remaining TTL in seconds for a key under the specified namespace.
    * Returns -2 if key does not exist, -1 if no TTL is set.
    */
   async getTTL(namespace: CacheNamespace, key: string): Promise<number> {
      const fullKey = this.getKey(namespace, key);
      return this.redisService.ttl(fullKey);
   }

   /**
    * Extends the TTL of an existing key by additional seconds.
    *
    * @param namespace The domain namespace
    * @param key Key within the namespace
    * @param additionalSeconds Seconds to add to current TTL
    * @returns True if TTL was extended, false if key does not exist or parameter invalid
    */
   async extendTTL(namespace: CacheNamespace, key: string, additionalSeconds: number): Promise<boolean> {
      if (additionalSeconds <= 0) return false;
      const fullKey = this.getKey(namespace, key);
      const client = this.redisService.getClient();
      if (!client) return false;
      try {
         const currentTtl = await client.ttl(fullKey);
         if (currentTtl === -2) {
            return false;
         }
         const newTtl = currentTtl === -1 ? additionalSeconds : currentTtl + additionalSeconds;
         const res = await client.expire(fullKey, newTtl);
         return res === 1;
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache extendTTL failed for key "${fullKey}": ${error.message}`);
         return false;
      }
   }

   /**
    * Sets expiration time for a key to an absolute Unix timestamp or Date.
    *
    * @param namespace The domain namespace
    * @param key Key within the namespace
    * @param timestamp Date object or Unix timestamp (seconds or milliseconds)
    * @returns True if expiration was set
    */
   async setExpireAt(namespace: CacheNamespace, key: string, timestamp: number | Date): Promise<boolean> {
      const fullKey = this.getKey(namespace, key);
      const client = this.redisService.getClient();
      if (!client) return false;
      try {
         let unixSeconds: number;
         if (timestamp instanceof Date) {
            unixSeconds = Math.floor(timestamp.getTime() / 1000);
         } else if (timestamp > 1e11) {
            unixSeconds = Math.floor(timestamp / 1000);
         } else {
            unixSeconds = Math.floor(timestamp);
         }
         const res = await client.expireat(fullKey, unixSeconds);
         return res === 1;
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Cache setExpireAt failed for key "${fullKey}": ${error.message}`);
         return false;
      }
   }

   /**
    * Deletes all keys matching a pattern within the specified namespace.
    *
    * @param namespace The domain namespace
    * @param pattern Glob pattern (e.g., 'otp:*' or '*')
    * @returns Total number of deleted keys
    */
   async deleteByPattern(namespace: CacheNamespace, pattern: string): Promise<number> {
      const fullPattern = this.getKey(namespace, pattern);
      return this.redisService.deleteByPattern(fullPattern);
   }

   /**
    * Increments the number stored at key by one under the specified namespace.
    */
   async incr(namespace: CacheNamespace, key: string): Promise<number> {
      const fullKey = this.getKey(namespace, key);
      return this.redisService.incr(fullKey);
   }

   /**
    * Sets a timeout on key under the specified namespace.
    */
   async expire(namespace: CacheNamespace, key: string, ttlSeconds: number): Promise<void> {
      const fullKey = this.getKey(namespace, key);
      await this.redisService.expire(fullKey, ttlSeconds);
   }

   /**
    * Executes a health probe on Redis and returns connection status and latency.
    */
   async healthCheck(timeoutMs: number = 2000): Promise<CacheHealthStatus> {
      return this.redisService.healthCheck(timeoutMs);
   }
}
