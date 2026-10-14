import { Injectable, Logger, Optional } from '@nestjs/common';
import { uuidv7 } from '@common/utils';
import { RedisService } from '@common/redis';
import { RetryJob, RetryQueueAddOptions } from '@common/queues/retry-queue.interface';

@Injectable()
export class RetryQueueService {
   private readonly logger = new Logger(RetryQueueService.name);
   private readonly inMemoryQueues = new Map<string, Map<string, RetryJob>>();
   private readonly inMemoryDeadLetter = new Map<string, Map<string, RetryJob>>();

   constructor(@Optional() private readonly redisService?: RedisService) {}

   private getRedisKey(queueName: string): string {
      return `retry_queue:${queueName}`;
   }

   private getDeadLetterKey(queueName: string): string {
      return `retry_queue:${queueName}:dead_letter`;
   }

   async add<T>(queueName: string, data: T, options?: RetryQueueAddOptions): Promise<string> {
      const jobId = uuidv7();
      const now = Date.now();
      const delayMs = options?.delayMs ?? 0;

      const job: RetryJob<T> = {
         id: jobId,
         queueName,
         data,
         retryCount: 0,
         maxRetries: options?.maxRetries ?? 5,
         nextRunAt: now + delayMs,
         createdAt: now,
      };

      const redis = this.redisService?.getClient();
      if (redis) {
         try {
            await redis.hset(this.getRedisKey(queueName), jobId, JSON.stringify(job));
            this.logger.debug(`[${queueName}] Enqueued job ${jobId} to Redis`);
            return jobId;
         } catch (err) {
            this.logger.warn(`Redis failed to enqueue job, falling back to in-memory: ${String(err)}`);
         }
      }

      if (!this.inMemoryQueues.has(queueName)) {
         this.inMemoryQueues.set(queueName, new Map());
      }
      this.inMemoryQueues.get(queueName)!.set(jobId, job);
      this.logger.debug(`[${queueName}] Enqueued job ${jobId} to in-memory store`);
      return jobId;
   }

   async getNextJob<T>(queueName: string): Promise<RetryJob<T> | null> {
      const now = Date.now();
      const redis = this.redisService?.getClient();

      if (redis) {
         try {
            const rawJobs = await redis.hgetall(this.getRedisKey(queueName));
            for (const payload of Object.values(rawJobs)) {
               const job = JSON.parse(payload) as RetryJob<T>;
               if (job.nextRunAt <= now) {
                  return job;
               }
            }
            return null;
         } catch (err) {
            this.logger.warn(`Redis getNextJob failed, using in-memory: ${String(err)}`);
         }
      }

      const queue = this.inMemoryQueues.get(queueName);
      if (!queue) return null;

      for (const job of queue.values()) {
         if (job.nextRunAt <= now) {
            return job as RetryJob<T>;
         }
      }

      return null;
   }

   async completeJob(queueName: string, jobId: string): Promise<void> {
      const redis = this.redisService?.getClient();
      if (redis) {
         try {
            await redis.hdel(this.getRedisKey(queueName), jobId);
            return;
         } catch (err) {
            this.logger.warn(`Redis completeJob failed: ${String(err)}`);
         }
      }

      const queue = this.inMemoryQueues.get(queueName);
      if (queue) {
         queue.delete(jobId);
      }
   }

   async failJob(queueName: string, jobId: string, error: string): Promise<boolean> {
      let job: RetryJob | null = null;
      const redis = this.redisService?.getClient();

      if (redis) {
         try {
            const raw = await redis.hget(this.getRedisKey(queueName), jobId);
            if (raw) {
               job = JSON.parse(raw) as RetryJob;
            }
         } catch (err) {
            this.logger.warn(`Redis failJob lookup failed: ${String(err)}`);
         }
      }

      if (!job) {
         const queue = this.inMemoryQueues.get(queueName);
         job = queue?.get(jobId) ?? null;
      }

      if (!job) {
         return false;
      }

      job.retryCount += 1;
      job.lastError = error;

      if (job.retryCount >= job.maxRetries) {
         this.logger.error(
            `[${queueName}] Job ${jobId} exceeded max retries (${job.maxRetries}). Moving to dead letter queue. Error: ${error}`,
         );

         if (redis) {
            try {
               await redis.hdel(this.getRedisKey(queueName), jobId);
               await redis.hset(this.getDeadLetterKey(queueName), jobId, JSON.stringify(job));
               return false;
            } catch (err) {
               this.logger.warn(`Redis DLQ move failed: ${String(err)}`);
            }
         }

         const queue = this.inMemoryQueues.get(queueName);
         if (queue) queue.delete(jobId);

         if (!this.inMemoryDeadLetter.has(queueName)) {
            this.inMemoryDeadLetter.set(queueName, new Map());
         }
         this.inMemoryDeadLetter.get(queueName)!.set(jobId, job);
         return false;
      }

      // Exponential backoff: base 1000ms * 2^retryCount + jitter
      const backoffMs = Math.min(1000 * Math.pow(2, job.retryCount) + Math.random() * 500, 60000);
      job.nextRunAt = Date.now() + backoffMs;

      this.logger.warn(
         `[${queueName}] Job ${jobId} failed (attempt ${job.retryCount}/${job.maxRetries}). Retrying in ${Math.round(backoffMs)}ms. Error: ${error}`,
      );

      if (redis) {
         try {
            await redis.hset(this.getRedisKey(queueName), jobId, JSON.stringify(job));
            return true;
         } catch (err) {
            this.logger.warn(`Redis requeue failed: ${String(err)}`);
         }
      }

      const queue = this.inMemoryQueues.get(queueName);
      if (queue) {
         queue.set(jobId, job);
      }
      return true;
   }

   async getQueueSize(queueName: string): Promise<number> {
      const redis = this.redisService?.getClient();
      if (redis) {
         try {
            return await redis.hlen(this.getRedisKey(queueName));
         } catch (err) {
            this.logger.warn(`Redis getQueueSize failed: ${String(err)}`);
         }
      }

      return this.inMemoryQueues.get(queueName)?.size ?? 0;
   }

   async getDeadLetterSize(queueName: string): Promise<number> {
      const redis = this.redisService?.getClient();
      if (redis) {
         try {
            return await redis.hlen(this.getDeadLetterKey(queueName));
         } catch (err) {
            this.logger.warn(`Redis getDeadLetterSize failed: ${String(err)}`);
         }
      }

      return this.inMemoryDeadLetter.get(queueName)?.size ?? 0;
   }

   async processJobs<T>(queueName: string, handler: (data: T) => Promise<void>, batchSize = 10): Promise<number> {
      let processedCount = 0;

      for (let i = 0; i < batchSize; i++) {
         const job = await this.getNextJob<T>(queueName);
         if (!job) break;

         try {
            await handler(job.data);
            await this.completeJob(queueName, job.id);
            processedCount++;
         } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            await this.failJob(queueName, job.id, errorMessage);
         }
      }

      return processedCount;
   }
}
