import { HEALTH_INDICATOR_NAMES, HealthIndicatorStatus } from '@common/constants';
import { DatabaseHealthIndicator } from '@common/grpc-health/indicators/database-health.indicator';

describe('DatabaseHealthIndicator', () => {
   it('should report status up when query succeeds', async () => {
      const pingFn = jest.fn().mockResolvedValue([{ 1: 1 }]);
      const indicator = new DatabaseHealthIndicator(HEALTH_INDICATOR_NAMES.POSTGRES, pingFn);

      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.UP);
      expect(result.name).toBe(HEALTH_INDICATOR_NAMES.POSTGRES);
      expect(result.details?.latencyMs).toBeGreaterThanOrEqual(0);
      expect(pingFn).toHaveBeenCalledTimes(1);
   });

   it('should report status down when query fails', async () => {
      const pingFn = jest.fn().mockRejectedValue(new Error('Connection terminated'));
      const indicator = new DatabaseHealthIndicator(HEALTH_INDICATOR_NAMES.POSTGRES, pingFn);

      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.DOWN);
      expect(result.name).toBe(HEALTH_INDICATOR_NAMES.POSTGRES);
      expect(result.error).toContain('Connection terminated');
   });

   it('should report status down when query times out', async () => {
      const slowPing = () => new Promise((resolve) => setTimeout(resolve, 50));
      const indicator = new DatabaseHealthIndicator(HEALTH_INDICATOR_NAMES.POSTGRES, slowPing, 10);

      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.DOWN);
      expect(result.error).toContain('timed out');
   });

   it('should instantiate cleanly via static fromPrisma helper', async () => {
      const mockPrisma = {
         $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      };
      const indicator = DatabaseHealthIndicator.fromPrisma(mockPrisma);

      const result = await indicator.check();

      expect(result.status).toBe(HealthIndicatorStatus.UP);
      expect(result.name).toBe(HEALTH_INDICATOR_NAMES.DATABASE);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
   });
});
