import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '@common/redis/redis.service';

export interface BloomFilterOptions {
   size?: number; // Number of bits (m), default 1,000,000
   hashCount?: number; // Number of hash functions (k), default 7
}

@Injectable()
export class BloomFilterService {
   private readonly logger = new Logger(BloomFilterService.name);
   private readonly defaultSize = 1_000_000;
   private readonly defaultHashCount = 7;
   private readonly localBitmaps = new Map<string, Uint8Array>();

   constructor(private readonly redisService: RedisService) {}

   /**
    * Compute bit offsets using Kirsch-Mitzenmacher optimization:
    * g_i(x) = (h1(x) + i * h2(x) + i^2) mod m
    */
   getOffsets(item: string, size: number = this.defaultSize, hashCount: number = this.defaultHashCount): number[] {
      const hash = createHash('sha256').update(item).digest();
      const h1 = hash.readUInt32BE(0);
      const h2 = hash.readUInt32BE(4) || 1;

      const offsets: number[] = [];
      for (let i = 0; i < hashCount; i++) {
         const combined = (BigInt(h1) + BigInt(i) * BigInt(h2) + BigInt(i * i)) % BigInt(size);
         offsets.push(Number(combined));
      }
      return offsets;
   }

   private getOrCreateLocalBitmap(key: string, size: number): Uint8Array {
      let bitmap = this.localBitmaps.get(key);
      if (!bitmap) {
         bitmap = new Uint8Array(Math.ceil(size / 8));
         this.localBitmaps.set(key, bitmap);
      }
      return bitmap;
   }

   private setLocalBit(bitmap: Uint8Array, offset: number): void {
      const byteIndex = Math.floor(offset / 8);
      const bitPosition = 7 - (offset % 8);
      if (byteIndex < bitmap.length) {
         bitmap[byteIndex] |= 1 << bitPosition;
      }
   }

   private getLocalBit(bitmap: Uint8Array, offset: number): boolean {
      const byteIndex = Math.floor(offset / 8);
      const bitPosition = 7 - (offset % 8);
      if (byteIndex >= bitmap.length) {
         return false;
      }
      return ((bitmap[byteIndex] >> bitPosition) & 1) === 1;
   }

   /**
    * Add an item to the Bloom Filter bitmap.
    */
   async add(key: string, item: string, options?: BloomFilterOptions): Promise<void> {
      const size = options?.size || this.defaultSize;
      const hashCount = options?.hashCount || this.defaultHashCount;
      const offsets = this.getOffsets(item, size, hashCount);

      // Set in local fallback bitmap
      const localBitmap = this.getOrCreateLocalBitmap(key, size);
      for (const offset of offsets) {
         this.setLocalBit(localBitmap, offset);
      }

      const client = this.redisService.getClient();
      if (client) {
         try {
            const pipeline = client.pipeline();
            for (const offset of offsets) {
               pipeline.setbit(key, offset, 1);
            }
            await pipeline.exec();
         } catch (err: unknown) {
            const error = err as Error;
            this.logger.warn(`Failed to set bits in Redis for key "${key}": ${error.message}`);
         }
      }
   }

   /**
    * Add multiple items to the Bloom Filter bitmap in batch.
    */
   async addBatch(key: string, items: string[], options?: BloomFilterOptions): Promise<void> {
      if (items.length === 0) return;

      const size = options?.size || this.defaultSize;
      const hashCount = options?.hashCount || this.defaultHashCount;
      const localBitmap = this.getOrCreateLocalBitmap(key, size);

      const client = this.redisService.getClient();
      const pipeline = client ? client.pipeline() : null;

      for (const item of items) {
         const offsets = this.getOffsets(item, size, hashCount);
         for (const offset of offsets) {
            this.setLocalBit(localBitmap, offset);
            if (pipeline) {
               pipeline.setbit(key, offset, 1);
            }
         }
      }

      if (pipeline) {
         try {
            await pipeline.exec();
         } catch (err: unknown) {
            const error = err as Error;
            this.logger.warn(`Failed to execute batch setbit pipeline for key "${key}": ${error.message}`);
         }
      }
   }

   /**
    * Test if an item might be in the Bloom Filter.
    * Returns false if definitely not in set.
    * Returns true if probably in set.
    */
   async contains(key: string, item: string, options?: BloomFilterOptions): Promise<boolean> {
      const size = options?.size || this.defaultSize;
      const hashCount = options?.hashCount || this.defaultHashCount;
      const offsets = this.getOffsets(item, size, hashCount);

      const client = this.redisService.getClient();
      if (client) {
         try {
            const pipeline = client.pipeline();
            for (const offset of offsets) {
               pipeline.getbit(key, offset);
            }
            const results = await pipeline.exec();
            if (results) {
               for (const [err, bit] of results) {
                  if (err || Number(bit) === 0) {
                     return false;
                  }
               }
               return true;
            }
         } catch (err: unknown) {
            const error = err as Error;
            this.logger.warn(`Redis contains check failed for key "${key}": ${error.message}`);
         }
      }

      // In-memory local bitmap fallback
      const localBitmap = this.localBitmaps.get(key);
      if (!localBitmap) {
         // If no Redis and no local bitmap, assume might exist so DB check happens safely
         return true;
      }

      for (const offset of offsets) {
         if (!this.getLocalBit(localBitmap, offset)) {
            return false;
         }
      }

      return true;
   }

   /**
    * Reset / clear the Bloom Filter bitmap.
    */
   async reset(key: string): Promise<void> {
      this.localBitmaps.delete(key);
      await this.redisService.del(key);
   }
}
