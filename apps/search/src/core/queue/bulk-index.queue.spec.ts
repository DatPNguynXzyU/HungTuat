import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BulkIndexQueue } from '@search/core/queue/bulk-index.queue';
import { BulkOperation } from '@search/core/queue/bulk-operation.interface';
import { BULK_INDEX_JOB, SEARCH_INDEXING_QUEUE } from '@search/core/queue/queue.constants';

describe('BulkIndexQueue', () => {
   let service: BulkIndexQueue;
   let mockAdd: jest.Mock;
   let mockAddBulk: jest.Mock;
   let mockQueue: Partial<Queue>;

   beforeEach(async () => {
      mockAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
      mockAddBulk = jest.fn().mockResolvedValue([{ id: 'job-1' }]);
      mockQueue = {
         add: mockAdd,
         addBulk: mockAddBulk,
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            BulkIndexQueue,
            {
               provide: getQueueToken(SEARCH_INDEXING_QUEUE),
               useValue: mockQueue,
            },
         ],
      }).compile();

      service = module.get<BulkIndexQueue>(BulkIndexQueue);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('addOperation', () => {
      it('should add operation to queue with generated jobId', async () => {
         const op: BulkOperation = {
            operation: 'index',
            index: 'users',
            documentId: 'user-1',
            data: { username: 'test' },
         };

         await service.addOperation(op);

         expect(mockAdd).toHaveBeenCalledWith(BULK_INDEX_JOB, op, expect.any(Object));
         const calls = mockAdd.mock.calls as Array<[string, BulkOperation, { jobId: string }]>;
         const firstCall = calls[0];
         expect(firstCall?.[2]?.jobId).toContain('index-users-user-1-');
      });
   });

   describe('addOperations', () => {
      it('should call queue.addBulk for batch operations', async () => {
         const ops: BulkOperation[] = [
            { operation: 'index', index: 'users', documentId: 'user-1' },
            { operation: 'delete', index: 'users', documentId: 'user-2' },
         ];

         await service.addOperations(ops);

         expect(mockAddBulk).toHaveBeenCalledWith(
            expect.arrayContaining([
               expect.objectContaining({ name: BULK_INDEX_JOB, data: ops[0] }),
               expect.objectContaining({ name: BULK_INDEX_JOB, data: ops[1] }),
            ]),
         );
      });
   });

   describe('getQueue', () => {
      it('should return internal bullmq queue instance', () => {
         expect(service.getQueue()).toBe(mockQueue);
      });
   });
});
