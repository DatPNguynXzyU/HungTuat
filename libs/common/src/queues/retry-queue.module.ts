import { Module } from '@nestjs/common';
import { RedisModule } from '@common/redis';
import { RetryQueueService } from '@common/queues/retry-queue.service';

@Module({
   imports: [RedisModule],
   providers: [RetryQueueService],
   exports: [RetryQueueService],
})
export class RetryQueueModule {}
