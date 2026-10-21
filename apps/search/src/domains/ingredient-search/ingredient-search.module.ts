import { Module } from '@nestjs/common';
import { RmqModule } from '@common';
import { ElasticsearchModule } from '@search/core/elasticsearch';
import { QueueModule } from '@search/core/queue';
import { MetricsModule } from '@search/core/metrics';
import { IngredientSearchController } from '@search/domains/ingredient-search/ingredient-search.controller';
import { IngredientSearchService } from '@search/domains/ingredient-search/ingredient-search.service';

@Module({
   imports: [ElasticsearchModule, QueueModule, MetricsModule, RmqModule],
   controllers: [IngredientSearchController],
   providers: [IngredientSearchService],
   exports: [IngredientSearchService],
})
export class IngredientSearchModule {}
