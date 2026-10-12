import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ElasticsearchService } from '@search/core/elasticsearch';

@Injectable()
export class ElasticsearchHealthIndicator extends HealthIndicator {
   constructor(private readonly esService: ElasticsearchService) {
      super();
   }

   async isHealthy(key: string): Promise<HealthIndicatorResult> {
      try {
         const client = this.esService.getClient();
         const health = await client.cluster.health({ timeout: '5s' });

         const isHealthy = health.status !== 'red';
         const details = {
            status: health.status,
            nodes: health.number_of_nodes,
            activeShards: health.active_shards,
            relocatingShards: health.relocating_shards,
            initializingShards: health.initializing_shards,
            unassignedShards: health.unassigned_shards,
         };

         const result = this.getStatus(key, isHealthy, details);

         if (!isHealthy) {
            throw new HealthCheckError('Elasticsearch cluster is unhealthy', result);
         }

         return result;
      } catch (error) {
         if (error instanceof HealthCheckError) {
            throw error;
         }
         const result = this.getStatus(key, false, {
            message: error instanceof Error ? error.message : String(error),
         });
         throw new HealthCheckError('Elasticsearch unreachable', result);
      }
   }
}
