import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BulkOperation } from '@search/core/queue/bulk-operation.interface';
import { BULK_INDEX_JOB, SEARCH_INDEXING_QUEUE } from '@search/core/queue/queue.constants';

@Injectable()
export class BulkIndexQueue {
   constructor(@InjectQueue(SEARCH_INDEXING_QUEUE) private readonly queue: Queue<BulkOperation>) {}

   async addOperation(op: BulkOperation): Promise<void> {
      await this.queue.add(BULK_INDEX_JOB, op, {
         jobId: `${op.operation}-${op.index}-${op.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });
   }

   async addOperations(ops: BulkOperation[]): Promise<void> {
      const jobs = ops.map((op) => ({
         name: BULK_INDEX_JOB,
         data: op,
         opts: {
            jobId: `${op.operation}-${op.index}-${op.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
         },
      }));
      await this.queue.addBulk(jobs);
   }

   getQueue(): Queue<BulkOperation> {
      return this.queue;
   }
}
