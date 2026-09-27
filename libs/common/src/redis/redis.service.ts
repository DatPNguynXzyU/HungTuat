import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { CommonConfigService } from '@common/config/common-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(RedisService.name);
   private client: Redis | null = null;

   constructor(private readonly config: CommonConfigService) {}

   onModuleInit(): void {
      try {
         const redisConfig = this.config.redis;
         this.client = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password || undefined,
            lazyConnect: true,
            retryStrategy: (times: number) => {
               if (times > 3) {
                  return null;
               }
               return Math.min(times * 100, 3000);
            },
         });

         this.client.on('error', (err: Error) => {
            this.logger.warn(`Redis client error: ${err.message}`);
         });
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Failed to initialize Redis client: ${error.message}`);
      }
   }

   async onModuleDestroy(): Promise<void> {
      if (this.client) {
         await this.client.quit().catch(() => {});
      }
   }

   getClient(): Redis | null {
      return this.client;
   }

   async get(key: string): Promise<string | null> {
      if (!this.client) return null;
      try {
         return await this.client.get(key);
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Redis GET failed for key "${key}": ${error.message}`);
         return null;
      }
   }

   async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
      if (!this.client) return;
      try {
         if (ttlSeconds && ttlSeconds > 0) {
            await this.client.set(key, value, 'EX', ttlSeconds);
         } else {
            await this.client.set(key, value);
         }
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Redis SET failed for key "${key}": ${error.message}`);
      }
   }

   async del(key: string): Promise<void> {
      if (!this.client) return;
      try {
         await this.client.del(key);
      } catch (err: unknown) {
         const error = err as Error;
         this.logger.warn(`Redis DEL failed for key "${key}": ${error.message}`);
      }
   }

   async getJson<T>(key: string): Promise<T | null> {
      const data = await this.get(key);
      if (!data) return null;
      try {
         return JSON.parse(data) as T;
      } catch {
         return null;
      }
   }

   async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const serialized = JSON.stringify(value);
      await this.set(key, serialized, ttlSeconds);
   }
}
