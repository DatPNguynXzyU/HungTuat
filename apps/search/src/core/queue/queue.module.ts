import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchConfigModule, SearchConfigService } from '@search/config';
import { ElasticsearchModule } from '@search/core/elasticsearch';
import { BulkIndexQueue } from '@search/core/queue/bulk-index.queue';
import { BulkIndexProcessor } from '@search/core/queue/bulk-processor.service';
import { SEARCH_INDEXING_QUEUE } from '@search/core/queue/queue.constants';

@Module({
   imports: [
      BullModule.forRootAsync({
         imports: [SearchConfigModule],
         inject: [SearchConfigService],
         useFactory: (config: SearchConfigService) => ({
            connection: {
               host: config.redis.host,
               port: config.redis.port,
               password: config.redis.password || undefined,
            },
         }),
      }),
      BullModule.registerQueue({
         name: SEARCH_INDEXING_QUEUE,
         defaultJobOptions: {
            attempts: 3,
            backoff: {
               type: 'exponential',
               delay: 5000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
         },
      }),
      ElasticsearchModule,
   ],
   providers: [BulkIndexQueue, BulkIndexProcessor],
   exports: [BullModule, BulkIndexQueue, BulkIndexProcessor],
})
export class QueueModule {}
