import { RetryQueueService } from '@common/queues/retry-queue.service';

describe('RetryQueueService', () => {
   let service: RetryQueueService;

   beforeEach(() => {
      // In-memory mode (no redis client)
      service = new RetryQueueService();
   });

   it('should enqueue and retrieve a job', async () => {
      const jobId = await service.add('test-queue', { userId: '123', action: 'sync' });
      expect(jobId).toBeDefined();

      const size = await service.getQueueSize('test-queue');
      expect(size).toBe(1);

      const job = await service.getNextJob<{ userId: string; action: string }>('test-queue');
      expect(job).toBeDefined();
      expect(job?.id).toBe(jobId);
      expect(job?.data.userId).toBe('123');

      await service.completeJob('test-queue', jobId);
      const remaining = await service.getQueueSize('test-queue');
      expect(remaining).toBe(0);
   });

   it('should handle retry and move to dead-letter queue when max retries exceeded', async () => {
      const jobId = await service.add('dlq-queue', { item: 'xyz' }, { maxRetries: 2 });

      // First failure
      const requeued = await service.failJob('dlq-queue', jobId, 'First network glitch');
      expect(requeued).toBe(true);

      // Second failure -> reaches maxRetries 2 -> moves to DLQ
      const requeuedAgain = await service.failJob('dlq-queue', jobId, 'Permanent outage');
      expect(requeuedAgain).toBe(false);

      const activeSize = await service.getQueueSize('dlq-queue');
      const dlqSize = await service.getDeadLetterSize('dlq-queue');
      expect(activeSize).toBe(0);
      expect(dlqSize).toBe(1);
   });

   it('should process jobs successfully using processJobs', async () => {
      await service.add('batch-queue', { count: 1 });
      await service.add('batch-queue', { count: 2 });

      const processed: number[] = [];
      const count = await service.processJobs<{ count: number }>('batch-queue', (data) => {
         processed.push(data.count);
         return Promise.resolve();
      });

      expect(count).toBe(2);
      expect(processed).toEqual([1, 2]);
      const remaining = await service.getQueueSize('batch-queue');
      expect(remaining).toBe(0);
   });
});
