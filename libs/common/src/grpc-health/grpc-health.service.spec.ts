import { ServingStatus } from '@contracts/health';
import { HealthIndicatorStatus } from '@common/constants';
import { GrpcHealthService } from '@common/grpc-health/grpc-health.service';
import type { IHealthIndicator } from '@common/grpc-health/interfaces/health-indicator.interface';
import { firstValueFrom, toArray, take } from 'rxjs';

describe('GrpcHealthService', () => {
   let service: GrpcHealthService;

   beforeEach(() => {
      service = new GrpcHealthService([]);
   });

   it('should return SERVING by default when no indicators are registered', async () => {
      const res = await service.check();
      expect(res.status).toBe(ServingStatus.SERVING);
   });

   it('should return SERVING when all registered indicators report UP', async () => {
      const mockDb: IHealthIndicator = {
         name: 'db',
         check: jest.fn().mockResolvedValue({ name: 'db', status: HealthIndicatorStatus.UP }),
      };
      const mockRedis: IHealthIndicator = {
         name: 'redis',
         check: jest.fn().mockResolvedValue({ name: 'redis', status: HealthIndicatorStatus.UP }),
      };

      const healthService = new GrpcHealthService([mockDb, mockRedis]);
      const res = await healthService.check();

      expect(res.status).toBe(ServingStatus.SERVING);
      expect(mockDb.check).toHaveBeenCalledTimes(1);
      expect(mockRedis.check).toHaveBeenCalledTimes(1);
   });

   it('should return NOT_SERVING when at least one indicator reports DOWN', async () => {
      const mockDb: IHealthIndicator = {
         name: 'db',
         check: jest.fn().mockResolvedValue({ name: 'db', status: HealthIndicatorStatus.UP }),
      };
      const mockRedis: IHealthIndicator = {
         name: 'redis',
         check: jest
            .fn()
            .mockResolvedValue({ name: 'redis', status: HealthIndicatorStatus.DOWN, error: 'Conn failed' }),
      };

      const healthService = new GrpcHealthService([mockDb, mockRedis]);
      const res = await healthService.check();

      expect(res.status).toBe(ServingStatus.NOT_SERVING);
   });

   it('should return NOT_SERVING when an indicator check rejects', async () => {
      const mockDb: IHealthIndicator = {
         name: 'db',
         check: jest.fn().mockRejectedValue(new Error('Fatal DB crash')),
      };

      const healthService = new GrpcHealthService([mockDb]);
      const res = await healthService.check();

      expect(res.status).toBe(ServingStatus.NOT_SERVING);
   });

   it('should return NOT_SERVING when service status is explicitly set to NOT_SERVING', async () => {
      service.setStatus('auth.v1.AuthService', ServingStatus.NOT_SERVING);
      const res = await service.check('auth.v1.AuthService');
      expect(res.status).toBe(ServingStatus.NOT_SERVING);
   });

   it('should emit initial status and updates via watch stream (Observer Pattern)', async () => {
      const watch$ = service.watch('');

      const collectedPromise = firstValueFrom(watch$.pipe(take(2), toArray()));

      // Transition status to trigger observer
      setTimeout(() => {
         service.setStatus('', ServingStatus.NOT_SERVING);
      }, 20);

      const events = await collectedPromise;
      expect(events).toHaveLength(2);
      expect(events[0].status).toBe(ServingStatus.SERVING);
      expect(events[1].status).toBe(ServingStatus.NOT_SERVING);
   });

   it('should allow adding indicators dynamically via addIndicator', async () => {
      const mockIndicator: IHealthIndicator = {
         name: 'custom',
         check: jest.fn().mockResolvedValue({ name: 'custom', status: HealthIndicatorStatus.DOWN }),
      };

      service.addIndicator(mockIndicator);
      const res = await service.check();

      expect(res.status).toBe(ServingStatus.NOT_SERVING);
      expect(mockIndicator.check).toHaveBeenCalledTimes(1);
   });
});
