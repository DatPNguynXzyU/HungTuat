import { HealthController } from '@/modules/health/health.controller';
import { CacheHealthState, CacheService, HealthStatus } from '@common';

describe('HealthController', () => {
   let controller: HealthController;
   let mockCacheService: { healthCheck: jest.Mock };

   beforeEach(() => {
      mockCacheService = {
         healthCheck: jest.fn(),
      };
      controller = new HealthController(mockCacheService as unknown as CacheService);
   });

   describe('root', () => {
      it('should return basic health info with status ok', () => {
         const res = controller.root();
         expect(res.status).toBe(HealthStatus.OK);
         expect(res.uptime).toBeGreaterThanOrEqual(0);
         expect(res.timestamp).toBeDefined();
      });
   });

   describe('check', () => {
      it('should return health info including redis status when available', async () => {
         mockCacheService.healthCheck.mockResolvedValue({ status: CacheHealthState.UP, latency: 4 });
         const res = await controller.check();
         expect(res.status).toBe(HealthStatus.OK);
         expect(res.redis).toEqual({ status: CacheHealthState.UP, latency: 4 });
      });

      it('should return health info when cacheService is undefined', async () => {
         const standaloneController = new HealthController(undefined);
         const res = await standaloneController.check();
         expect(res.status).toBe(HealthStatus.OK);
         expect(res.redis).toBeUndefined();
      });
   });

   describe('checkRedis', () => {
      it('should return redis health details from cacheService', async () => {
         mockCacheService.healthCheck.mockResolvedValue({ status: CacheHealthState.UP, latency: 2 });
         const res = await controller.checkRedis();
         expect(res).toEqual({ status: CacheHealthState.UP, latency: 2 });
      });

      it('should return down status when cacheService is not available', async () => {
         const standaloneController = new HealthController(undefined);
         const res = await standaloneController.checkRedis();
         expect(res.status).toBe(CacheHealthState.DOWN);
         expect(res.message).toContain('not available');
      });
   });
});
