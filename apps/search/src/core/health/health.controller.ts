import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { ElasticsearchHealthIndicator } from '@search/core/health/elasticsearch.health';

@Controller('health')
export class HealthController {
   constructor(
      private readonly health: HealthCheckService,
      private readonly elasticsearch: ElasticsearchHealthIndicator,
      private readonly memory: MemoryHealthIndicator,
      private readonly disk: DiskHealthIndicator,
   ) {}

   @Get()
   @HealthCheck()
   check() {
      return this.health.check([
         () => this.elasticsearch.isHealthy('elasticsearch'),
         () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
         () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
         () => this.disk.checkStorage('disk', { threshold: 0.9, path: '/' }),
      ]);
   }

   @Get('live')
   @HealthCheck()
   liveness() {
      return this.health.check([() => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024)]);
   }

   @Get('ready')
   @HealthCheck()
   readiness() {
      return this.health.check([() => this.elasticsearch.isHealthy('elasticsearch')]);
   }
}
