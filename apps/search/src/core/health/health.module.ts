import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ElasticsearchModule } from '@search/core/elasticsearch';
import { ElasticsearchHealthIndicator } from '@search/core/health/elasticsearch.health';
import { HealthController } from '@search/core/health/health.controller';

@Module({
   imports: [TerminusModule, ElasticsearchModule],
   controllers: [HealthController],
   providers: [ElasticsearchHealthIndicator],
   exports: [ElasticsearchHealthIndicator],
})
export class HealthModule {}
