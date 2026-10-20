import { Injectable, Logger } from '@nestjs/common';
import { CacheHealthState, HEALTH_INDICATOR_DEFAULTS, HEALTH_INDICATOR_NAMES } from '@common/constants/health.constant';
import type { RedisService } from '@common/redis/redis.service';
import {
   HealthIndicatorStatus,
   type HealthIndicatorResult,
   type IHealthIndicator,
} from '@common/grpc-health/interfaces/health-indicator.interface';

/**
 * Concrete strategy indicator for verifying Redis connectivity and latency.
 */
@Injectable()
export class RedisHealthIndicator implements IHealthIndicator {
   readonly name: string;
   private readonly logger = new Logger(RedisHealthIndicator.name);
   private readonly redisService: RedisService;
   private readonly timeoutMs: number;

   constructor(
      redisService: RedisService,
      name: string = HEALTH_INDICATOR_NAMES.REDIS,
      timeoutMs: number = HEALTH_INDICATOR_DEFAULTS.REDIS_TIMEOUT_MS,
   ) {
      this.redisService = redisService;
      this.name = name;
      this.timeoutMs = timeoutMs;
   }

   async check(): Promise<HealthIndicatorResult> {
      try {
         const result = await this.redisService.healthCheck(this.timeoutMs);
         if (result.status === CacheHealthState.UP) {
            return {
               name: this.name,
               status: HealthIndicatorStatus.UP,
               details: { latencyMs: result.latency },
            };
         }

         return {
            name: this.name,
            status: HealthIndicatorStatus.DOWN,
            error: result.message || 'Redis is down or unreachable',
         };
      } catch (error: unknown) {
         const errorMessage = error instanceof Error ? error.message : String(error);
         this.logger.error(`Redis health check failed: ${errorMessage}`);
         return {
            name: this.name,
            status: HealthIndicatorStatus.DOWN,
            error: errorMessage,
         };
      }
   }
}
