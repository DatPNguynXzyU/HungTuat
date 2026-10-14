import { Module } from '@nestjs/common';
import { RmqModule } from '@common';
import { ElasticsearchModule } from '@search/core/elasticsearch';
import { QueueModule } from '@search/core/queue';
import { MetricsModule } from '@search/core/metrics';
import { UserSearchController } from '@search/domains/user-search/user-search.controller';
import { UserSearchService } from '@search/domains/user-search/user-search.service';

@Module({
   imports: [ElasticsearchModule, QueueModule, MetricsModule, RmqModule],
   controllers: [UserSearchController],
   providers: [UserSearchService],
   exports: [UserSearchService],
})
export class UserSearchModule {}
