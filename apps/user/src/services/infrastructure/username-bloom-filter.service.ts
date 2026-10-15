import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BloomFilterService, RedisService } from '@common';
import { UserRedisKeys, USER_REDIS_TTL } from '@user/constants/user-redis.constant';
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
      const initKey = UserRedisKeys.bloomInitialized('username');
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
      const initKey = UserRedisKeys.bloomInitialized('username');
      const usernames = await this.userRepository.findAllUsernames();

      if (usernames.length > 0) {
         const normalizedUsernames = usernames.map((username) => username.toLowerCase().trim());
         await this.bloomFilterService.addBatch(UserRedisKeys.bloomUsername(), normalizedUsernames);
      }

      await this.redisService.set(initKey, '1', USER_REDIS_TTL.BLOOM_INITIALIZED);
      this.logger.log(`Synchronized ${usernames.length} usernames into Bloom Filter`);
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
