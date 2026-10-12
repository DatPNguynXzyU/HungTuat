import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { HealthController } from '@search/core/health/health.controller';
import { ElasticsearchHealthIndicator } from '@search/core/health/elasticsearch.health';

describe('HealthController', () => {
   let controller: HealthController;

   const mockHealthCheckService = {
      check: jest.fn().mockImplementation((indicators: (() => unknown)[]) => {
         return Promise.all(indicators.map((fn) => fn())).then(() => ({ status: 'ok' }));
      }),
   };

   const mockElasticsearchHealth = {
      isHealthy: jest.fn().mockResolvedValue({ elasticsearch: { status: 'up' } }),
   };

   const mockMemory = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
      checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
   };

   const mockDisk = {
      checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [HealthController],
         providers: [
            { provide: HealthCheckService, useValue: mockHealthCheckService },
            { provide: ElasticsearchHealthIndicator, useValue: mockElasticsearchHealth },
            { provide: MemoryHealthIndicator, useValue: mockMemory },
            { provide: DiskHealthIndicator, useValue: mockDisk },
         ],
      }).compile();

      controller = module.get<HealthController>(HealthController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should execute full health check', async () => {
      const res = await controller.check();
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockElasticsearchHealth.isHealthy).toHaveBeenCalledWith('elasticsearch');
      expect(mockMemory.checkHeap).toHaveBeenCalled();
      expect(mockMemory.checkRSS).toHaveBeenCalled();
      expect(mockDisk.checkStorage).toHaveBeenCalled();
      expect(res).toEqual({ status: 'ok' });
   });

   it('should execute liveness check', async () => {
      const res = await controller.liveness();
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockMemory.checkHeap).toHaveBeenCalledWith('memory_heap', 500 * 1024 * 1024);
      expect(res).toEqual({ status: 'ok' });
   });

   it('should execute readiness check', async () => {
      const res = await controller.readiness();
      expect(mockHealthCheckService.check).toHaveBeenCalled();
      expect(mockElasticsearchHealth.isHealthy).toHaveBeenCalledWith('elasticsearch');
      expect(res).toEqual({ status: 'ok' });
   });
});
