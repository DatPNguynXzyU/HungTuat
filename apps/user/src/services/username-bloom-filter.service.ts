import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BloomFilterService, REDIS_KEY_PREFIX, REDIS_TTL, RedisService } from '@common';
import { USER_REPOSITORY, UserRepository } from '@user/repositories';

@Injectable()
export class UsernameBloomFilterService implements OnModuleInit {
   private readonly logger = new Logger(UsernameBloomFilterService.name);

   constructor(
      private readonly bloomFilterService: BloomFilterService,
      @Inject(USER_REPOSITORY)
      private readonly userRepository: UserRepository,
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
      const initKey = `${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}username`;
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
      const initKey = `${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}username`;
      const usernames = await this.userRepository.findAllUsernames();

      if (usernames.length > 0) {
         const normalizedUsernames = usernames.map((username) => username.toLowerCase().trim());
         await this.bloomFilterService.addBatch(REDIS_KEY_PREFIX.BLOOM_USERNAME, normalizedUsernames);
      }

      await this.redisService.set(initKey, '1', REDIS_TTL.BLOOM_INITIALIZED);
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
      return this.bloomFilterService.contains(REDIS_KEY_PREFIX.BLOOM_USERNAME, normalized);
   }

   /**
    * Add a newly registered username to the Bloom Filter.
    */
   async addUsername(username: string): Promise<void> {
      const normalized = username.toLowerCase().trim();
      await this.bloomFilterService.add(REDIS_KEY_PREFIX.BLOOM_USERNAME, normalized);
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

      const existingUser = await this.userRepository.findByUsername(normalized);
      return !existingUser;
   }
}
