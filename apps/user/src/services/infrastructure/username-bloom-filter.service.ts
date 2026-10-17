import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BloomFilterService, RedisService } from '@common';
import { UserRedisKeys, USER_REDIS_TTL, USER_REDIS_FLAGS } from '@user/constants/user-redis.constant';
import { USER_PROFILE_REPOSITORY, type IUserProfileRepository } from '@user/repositories';
import type { IUsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.interface';

@Injectable()
export class UsernameBloomFilterService implements OnModuleInit, IUsernameBloomFilterService {
   private readonly logger = new Logger(UsernameBloomFilterService.name);

   constructor(
      private readonly bloomFilterService: BloomFilterService,
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userRepository: IUserProfileRepository,
      private readonly redisService: RedisService,
   ) {}

   async onModuleInit(): Promise<void> {
      try {
         await this.initFilter();
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Failed to initialize Username Bloom Filter on startup: ${error.message}`);
      }
   }

   /**
    * Initialize the username bloom filter from database if not already initialized in Redis.
    */
   async initFilter(): Promise<void> {
      const initKey = UserRedisKeys.bloomUsernameInitialized();
      const isInitialized = await this.redisService.get(initKey);

      if (isInitialized) {
         this.logger.log('Username Bloom Filter is already initialized in Redis');
         return;
      }

      await this.syncFromDatabase();
   }

   /**
    * Synchronize all existing usernames from database into the Bloom Filter.
    */
   async syncFromDatabase(): Promise<number> {
      const initKey = UserRedisKeys.bloomUsernameInitialized();
      const usernames = await this.userRepository.findAllUsernames();

      if (usernames.length > 0) {
         const normalizedUsernames = usernames.map((username) => username.toLowerCase().trim());
         await this.bloomFilterService.addBatch(UserRedisKeys.bloomUsername(), normalizedUsernames);
      }

      await this.redisService.set(initKey, USER_REDIS_FLAGS.INITIALIZED, USER_REDIS_TTL.BLOOM_INITIALIZED);
      this.logger.log(`Synchronized ${usernames.length} usernames into Bloom Filter`);
      return usernames.length;
   }

   /**
    * Rebuilds the Bloom Filter from database using the Atomic Key Swap Pattern (Shadow Key).
    * Prevents race conditions and downtime while purging stale or reassigned usernames.
    */
   async rebuildFilter(): Promise<number> {
      const mainKey = UserRedisKeys.bloomUsername();
      const tempKey = UserRedisKeys.bloomUsernameTemp();
      const usernames = await this.userRepository.findAllUsernames();

      await this.bloomFilterService.reset(tempKey);

      if (usernames.length > 0) {
         const normalizedUsernames = usernames.map((username) => username.toLowerCase().trim());
         await this.bloomFilterService.addBatch(tempKey, normalizedUsernames);
      }

      const client = this.redisService.getClient();
      if (client) {
         try {
            await client.rename(tempKey, mainKey);
         } catch (err: unknown) {
            const error = err as Error;
            this.logger.warn(`Failed to atomically rename Bloom filter shadow key: ${error.message}`);
            await this.bloomFilterService.reset(mainKey);
            if (usernames.length > 0) {
               await this.bloomFilterService.addBatch(
                  mainKey,
                  usernames.map((u) => u.toLowerCase().trim()),
               );
            }
         }
      } else {
         await this.bloomFilterService.reset(mainKey);
         if (usernames.length > 0) {
            await this.bloomFilterService.addBatch(
               mainKey,
               usernames.map((u) => u.toLowerCase().trim()),
            );
         }
      }

      const initKey = UserRedisKeys.bloomUsernameInitialized();
      await this.redisService.set(initKey, USER_REDIS_FLAGS.INITIALIZED, USER_REDIS_TTL.BLOOM_INITIALIZED);
      this.logger.log(`Rebuilt Bloom Filter with ${usernames.length} active usernames`);
      return usernames.length;
   }

   /**
    * Check if a username might exist in the system using Bloom Filter.
    * Returns false -> 100% Guaranteed username DOES NOT exist.
    * Returns true -> Username MIGHT exist (requires DB check to verify).
    */
   async mightContain(username: string): Promise<boolean> {
      const normalized = username.toLowerCase().trim();
      return this.bloomFilterService.contains(UserRedisKeys.bloomUsername(), normalized);
   }

   /**
    * Add a newly registered username to the Bloom Filter.
    */
   async addUsername(username: string): Promise<void> {
      const normalized = username.toLowerCase().trim();
      await this.bloomFilterService.add(UserRedisKeys.bloomUsername(), normalized);
   }

   /**
    * Updates username registration in Bloom Filter.
    * 1. Immediately adds new username to Bloom Filter for instant collision protection.
    * 2. If changing from an existing username, triggers an atomic filter resynchronization
    *    to purge the previous username from the probabilistic set without blocking the caller.
    */
   async updateUsername(newUsername: string, oldUsername?: string | null): Promise<void> {
      const normalizedNew = newUsername.toLowerCase().trim();
      await this.addUsername(normalizedNew);

      if (oldUsername && oldUsername.toLowerCase().trim() !== normalizedNew) {
         setImmediate(async () => {
            try {
               await this.rebuildFilter();
            } catch (err: unknown) {
               const error = err as Error;
               this.logger.error(`Failed to rebuild Bloom filter after username change: ${error.message}`);
            }
         });
      }
   }

   /**
    * Removes username from active bloom filter by triggering a background rebuild.
    */
   removeUsername(username: string): Promise<void> {
      if (!username) {
         return Promise.resolve();
      }
      setImmediate(async () => {
         try {
            await this.rebuildFilter();
         } catch (err: unknown) {
            const error = err as Error;
            this.logger.error(`Failed to rebuild Bloom filter after username removal: ${error.message}`);
         }
      });
      return Promise.resolve();
   }

   /**
    * Check if a username is available for registration/update.
    * Uses Bloom filter first for fast path (0 DB queries when definitely available).
    */
   async isUsernameAvailable(username: string): Promise<boolean> {
      const normalized = username.toLowerCase().trim();
      const mightExist = await this.mightContain(normalized);
      if (!mightExist) {
         return true;
      }

      // False positive check: Query DB to confirm
      const existingUser = await this.userRepository.findByUsername(normalized);
      return !existingUser;
   }
}
