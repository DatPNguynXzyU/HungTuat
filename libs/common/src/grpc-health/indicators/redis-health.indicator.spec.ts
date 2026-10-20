import { CacheHealthState, HEALTH_INDICATOR_NAMES, HealthIndicatorStatus } from '@common/constants';
import { RedisHealthIndicator } from '@common/grpc-health/indicators/redis-health.indicator';
import type { RedisService } from '@common/redis/redis.service';

describe('RedisHealthIndicator', () => {
   let mockRedisService: { healthCheck: jest.Mock };

   beforeEach(() => {
      mockRedisService = {
         healthCheck: jest.fn(),
      };
   });

   it('should report status UP when redis service returns UP', async () => {
      mockRedisService.healthCheck.mockResolvedValue({
         status: CacheHealthState.UP,
         latency: 4,
      });

      const indicator = new RedisHealthIndicator(mockRedisService as unknown as RedisService);
      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.UP);
      expect(result.name).toBe(HEALTH_INDICATOR_NAMES.REDIS);
      expect(result.details?.latencyMs).toBe(4);
   });

   it('should report status DOWN when redis service returns DOWN', async () => {
      mockRedisService.healthCheck.mockResolvedValue({
         status: CacheHealthState.DOWN,
         message: 'Redis cluster unreachable',
      });

      const indicator = new RedisHealthIndicator(mockRedisService as unknown as RedisService);
      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.DOWN);
      expect(result.name).toBe(HEALTH_INDICATOR_NAMES.REDIS);
      expect(result.error).toBe('Redis cluster unreachable');
   });

   it('should report status DOWN when redis check throws', async () => {
      mockRedisService.healthCheck.mockRejectedValue(new Error('Connection error'));

      const indicator = new RedisHealthIndicator(mockRedisService as unknown as RedisService);
      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.DOWN);
      expect(result.error).toContain('Connection error');
   });
});
