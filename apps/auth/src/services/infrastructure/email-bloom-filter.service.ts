import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BloomFilterService, REDIS_KEY_PREFIX, REDIS_TTL, RedisService } from '@common';
import { AUTH_REPOSITORY, type IAuthRepository } from '@auth/repositories/auth.repository.interface';

@Injectable()
export class EmailBloomFilterService implements OnModuleInit {
   private readonly logger = new Logger(EmailBloomFilterService.name);

   constructor(
      private readonly bloomFilterService: BloomFilterService,
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: IAuthRepository,
      private readonly redisService: RedisService,
   ) {}

   async onModuleInit(): Promise<void> {
      try {
         await this.initFilter();
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Failed to initialize Email Bloom Filter on startup: ${error.message}`);
      }
   }

   /**
    * Initialize the email bloom filter from database if not already initialized in Redis.
    */
   async initFilter(): Promise<void> {
      const initKey = `${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}email`;
      const isInitialized = await this.redisService.get(initKey);

      if (isInitialized) {
         this.logger.log('Email Bloom Filter is already initialized in Redis');
         return;
      }

      await this.syncFromDatabase();
   }

   /**
    * Synchronize all existing emails from database into the Bloom Filter.
    */
   async syncFromDatabase(): Promise<number> {
      const initKey = `${REDIS_KEY_PREFIX.BLOOM_INITIALIZED}email`;
      const emails = await this.authRepository.findAllEmails();

      if (emails.length > 0) {
         const normalizedEmails = emails.map((email) => email.toLowerCase().trim());
         await this.bloomFilterService.addBatch(REDIS_KEY_PREFIX.BLOOM_EMAIL, normalizedEmails);
      }

      await this.redisService.set(initKey, '1', REDIS_TTL.BLOOM_INITIALIZED);
      this.logger.log(`Synchronized ${emails.length} emails into Bloom Filter`);
      return emails.length;
   }

   /**
    * Check if an email might exist in the system using Bloom Filter.
    * Returns false -> 100% Guaranteed email DOES NOT exist.
    * Returns true -> Email MIGHT exist (requires DB check to verify).
    */
   async mightContain(email: string): Promise<boolean> {
      const normalized = email.toLowerCase().trim();
      return this.bloomFilterService.contains(REDIS_KEY_PREFIX.BLOOM_EMAIL, normalized);
   }

   /**
    * Add a newly registered email to the Bloom Filter.
    */
   async addEmail(email: string): Promise<void> {
      const normalized = email.toLowerCase().trim();
      await this.bloomFilterService.add(REDIS_KEY_PREFIX.BLOOM_EMAIL, normalized);
   }

   /**
    * Check if an email is available for registration.
    * Uses Bloom filter first for fast path (0 DB queries when definitely available).
    */
   async isEmailAvailable(email: string): Promise<boolean> {
      const normalized = email.toLowerCase().trim();
      const mightExist = await this.mightContain(normalized);
      if (!mightExist) {
         return true;
      }

      const existingAccount = await this.authRepository.findByEmail(normalized);
      return !existingAccount;
   }
}
