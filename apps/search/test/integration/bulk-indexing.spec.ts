import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { ElasticsearchService } from '@search/core/elasticsearch';
import { BulkIndexProcessor } from '@search/core/queue/bulk-processor.service';
import { BulkIndexQueue } from '@search/core/queue/bulk-index.queue';
import { BulkOperation } from '@search/core/queue/bulk-operation.interface';
import { SEARCH_INDEXING_QUEUE } from '@search/core/queue/queue.constants';
import { getQueueToken } from '@nestjs/bullmq';

describe('Bulk Indexing Integration', () => {
   let processor: BulkIndexProcessor;
   let bulkQueue: BulkIndexQueue;

   const mockClient = {
      bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
   };

   const mockElasticsearchService = {
      getClient: jest.fn().mockReturnValue(mockClient),
   };

   const addedJobs: Array<{ name: string; data: BulkOperation }> = [];
   const mockQueue = {
      add: jest.fn().mockImplementation((name: string, data: BulkOperation) => {
         addedJobs.push({ name, data });
         return Promise.resolve({ id: `job-${addedJobs.length}` });
      }),
      addBulk: jest.fn().mockImplementation((jobs: Array<{ name: string; data: BulkOperation }>) => {
         addedJobs.push(...jobs);
         return Promise.resolve(jobs.map((_, i) => ({ id: `job-${i}` })));
      }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      jest.useFakeTimers();
      addedJobs.length = 0;

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            BulkIndexProcessor,
            BulkIndexQueue,
            {
               provide: ElasticsearchService,
               useValue: mockElasticsearchService,
            },
            {
               provide: getQueueToken(SEARCH_INDEXING_QUEUE),
               useValue: mockQueue,
            },
         ],
      }).compile();

      processor = module.get<BulkIndexProcessor>(BulkIndexProcessor);
      bulkQueue = module.get<BulkIndexQueue>(BulkIndexQueue);
   });

   afterEach(() => {
      jest.useRealTimers();
   });

   it('should batch multiple queue operations into 100-doc bulk request and flush remaining on interval', async () => {
      // 150 operations queued
      for (let i = 0; i < 150; i++) {
         await bulkQueue.addOperation({
            operation: 'index',
            index: 'users',
            documentId: `user-${i}`,
            data: { username: `user${i}` },
         });
      }

      expect(addedJobs).toHaveLength(150);

      // Feed jobs into processor
      const processPromises = addedJobs.map((j) =>
         processor.process({
            data: j.data,
         } as Job<BulkOperation>),
      );

      const calls = mockClient.bulk.mock.calls as Array<[{ operations: unknown[] }]>;

      // The first 100 items flush immediately
      expect(mockClient.bulk).toHaveBeenCalledTimes(1);
      expect(calls[0]?.[0].operations).toHaveLength(200); // 100 meta + 100 doc

      // The remaining 50 items flush after interval
      jest.advanceTimersByTime(5000);
      await Promise.all(processPromises);

      expect(mockClient.bulk).toHaveBeenCalledTimes(2);
      expect(calls[1]?.[0].operations).toHaveLength(100); // 50 meta + 50 doc
   });
});
