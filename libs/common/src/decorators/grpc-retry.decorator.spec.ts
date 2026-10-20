import { defer, of, throwError } from 'rxjs';
import { UseGrpcRetry } from '@common/decorators/grpc-retry.decorator';
import { FixedBackoffStrategy, RetryPolicyRegistry } from '@common/patterns/retry.pattern';
import { GrpcStatus } from '@common/exceptions/grpc.exception';
import { BadRequestException } from '@common/exceptions/http.exceptions';

class TestRetryConsumerService {
   public promiseAttempts = 0;
   public observableAttempts = 0;

   @UseGrpcRetry({
      name: 'test-retry-promise-service',
      maxAttempts: 3,
      backoff: new FixedBackoffStrategy(1),
   })
   async callPromiseDownstream(failCount: number): Promise<string> {
      await Promise.resolve();
      this.promiseAttempts++;
      if (this.promiseAttempts <= failCount) {
         const err = new Error('connection refused') as Error & { code?: number };
         err.code = GrpcStatus.UNAVAILABLE;
         throw err;
      }
      return 'promise-success';
   }

   @UseGrpcRetry({
      name: 'test-retry-observable-service',
      maxAttempts: 3,
      backoff: new FixedBackoffStrategy(1),
   })
   callObservableDownstream(failCount: number) {
      return defer(() => {
         this.observableAttempts++;
         if (this.observableAttempts <= failCount) {
            const err = new Error('connection refused') as Error & { code?: number };
            err.code = GrpcStatus.UNAVAILABLE;
            return throwError(() => err);
         }
         return of('observable-success');
      });
   }

   @UseGrpcRetry({
      name: 'test-retry-non-retryable-service',
      maxAttempts: 3,
      backoff: new FixedBackoffStrategy(1),
   })
   async callNonRetryableDownstream(): Promise<string> {
      await Promise.resolve();
      throw new BadRequestException('NON_RETRYABLE');
   }
}

describe('UseGrpcRetry Decorator', () => {
   let service: TestRetryConsumerService;

   beforeEach(() => {
      RetryPolicyRegistry.clear();
      service = new TestRetryConsumerService();
   });

   it('should execute Promise method and transparently recover after transient failure', async () => {
      const result = await service.callPromiseDownstream(1);
      expect(result).toBe('promise-success');
      expect(service.promiseAttempts).toBe(2);
   });

   it('should execute Observable method and recover after transient failure', (done) => {
      service.callObservableDownstream(1).subscribe({
         next: (res) => {
            expect(res).toBe('observable-success');
            expect(service.observableAttempts).toBe(2);
            done();
         },
         error: done,
      });
   });

   it('should fail immediately without retry on non-retryable error', async () => {
      await expect(service.callNonRetryableDownstream()).rejects.toThrow(BadRequestException);
   });
});
