import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { ElasticsearchService } from '@search/core/elasticsearch';
import { ElasticsearchHealthIndicator } from '@search/core/health/elasticsearch.health';

describe('ElasticsearchHealthIndicator', () => {
   let indicator: ElasticsearchHealthIndicator;

   const mockCluster = {
      health: jest.fn(),
   };

   const mockClient = {
      cluster: mockCluster,
   };

   const mockElasticsearchService = {
      getClient: jest.fn().mockReturnValue(mockClient),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ElasticsearchHealthIndicator,
            {
               provide: ElasticsearchService,
               useValue: mockElasticsearchService,
            },
         ],
      }).compile();

      indicator = module.get<ElasticsearchHealthIndicator>(ElasticsearchHealthIndicator);
   });

   it('should be defined', () => {
      expect(indicator).toBeDefined();
   });

   it('should return healthy status when cluster health is green or yellow', async () => {
      mockCluster.health.mockResolvedValue({
         status: 'green',
         number_of_nodes: 1,
         active_shards: 5,
         relocating_shards: 0,
         initializing_shards: 0,
         unassigned_shards: 0,
      });

      const result = await indicator.isHealthy('elasticsearch');

      expect(result).toEqual({
         elasticsearch: {
            status: 'green',
            activeShards: 5,
            initializingShards: 0,
            nodes: 1,
            relocatingShards: 0,
            unassignedShards: 0,
         },
      });
   });

   it('should throw HealthCheckError when cluster health is red', async () => {
      mockCluster.health.mockResolvedValue({
         status: 'red',
         number_of_nodes: 1,
         active_shards: 0,
         relocating_shards: 0,
         initializing_shards: 0,
         unassigned_shards: 5,
      });

      await expect(indicator.isHealthy('elasticsearch')).rejects.toThrow(HealthCheckError);
   });

   it('should throw HealthCheckError when elasticsearch ping/health throws', async () => {
      mockCluster.health.mockRejectedValue(new Error('Connection refused'));

      await expect(indicator.isHealthy('elasticsearch')).rejects.toThrow(HealthCheckError);
   });
});
