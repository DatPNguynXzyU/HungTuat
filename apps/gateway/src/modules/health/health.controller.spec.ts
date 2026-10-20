import { HealthController } from '@/modules/health/health.controller';
import { CacheHealthState, CacheService, HealthStatus } from '@common';
import { ServingStatus } from '@contracts/health';
import type { AuthService } from '@/modules/auth/auth.service';
import type { UsersService } from '@/modules/users/users.service';

describe('HealthController', () => {
   let controller: HealthController;
   let mockCacheService: { healthCheck: jest.Mock };
   let mockAuthService: { checkGrpcHealth: jest.Mock };
   let mockUsersService: { checkGrpcHealth: jest.Mock };

   beforeEach(() => {
      mockCacheService = {
         healthCheck: jest.fn(),
      };
      mockAuthService = {
         checkGrpcHealth: jest.fn(),
      };
      mockUsersService = {
         checkGrpcHealth: jest.fn(),
      };
      controller = new HealthController(
         mockCacheService as unknown as CacheService,
         mockAuthService as unknown as AuthService,
         mockUsersService as unknown as UsersService,
      );
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

   describe('checkGrpc', () => {
      it('should return SERVING status for both auth and user gRPC services when healthy', async () => {
         mockAuthService.checkGrpcHealth.mockResolvedValue({ status: ServingStatus.SERVING });
         mockUsersService.checkGrpcHealth.mockResolvedValue({ status: ServingStatus.SERVING });

         const res = await controller.checkGrpc();

         expect(res.auth.status).toBe(ServingStatus.SERVING);
         expect(res.user.status).toBe(ServingStatus.SERVING);
         expect(mockAuthService.checkGrpcHealth).toHaveBeenCalledTimes(1);
         expect(mockUsersService.checkGrpcHealth).toHaveBeenCalledTimes(1);
      });

      it('should handle partial or downstream service failures', async () => {
         mockAuthService.checkGrpcHealth.mockResolvedValue({ status: ServingStatus.SERVING });
         mockUsersService.checkGrpcHealth.mockRejectedValue(new Error('User gRPC unavailable'));

         const res = await controller.checkGrpc();

         expect(res.auth.status).toBe(ServingStatus.SERVING);
         expect(res.user.status).toBe(ServingStatus.NOT_SERVING);
      });

      it('should return UNKNOWN when services are undefined', async () => {
         const standaloneController = new HealthController(undefined, undefined, undefined);
         const res = await standaloneController.checkGrpc();

         expect(res.auth.status).toBe(ServingStatus.UNKNOWN);
         expect(res.user.status).toBe(ServingStatus.UNKNOWN);
      });
   });
});
