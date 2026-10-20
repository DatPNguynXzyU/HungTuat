import { defer, of, throwError } from 'rxjs';
import {
   FixedBackoffStrategy,
   LinearBackoffStrategy,
   ExponentialBackoffStrategy,
   isGrpcRetryable,
   JITTER_TYPES,
   RESILIENCE_ERROR_NAMES,
   TIMEOUT_ERROR_NAMES,
   RETRYABLE_GRPC_STATUS_CODES,
   NON_RETRYABLE_GRPC_STATUS_CODES,
   RETRYABLE_HTTP_STATUS_CODES,
   RetryPolicy,
   RetryPolicyRegistry,
   withGrpcRetry,
   createGrpcRetryChannelOptions,
} from '@common/patterns/retry.pattern';
import { CircuitBreakerOpenException, NETWORK_ERROR_CODES } from '@common/patterns/circuit-breaker.pattern';
import { GrpcStatus } from '@common/exceptions/grpc.exception';
import { BadRequestException, TimeoutException } from '@common/exceptions/http.exceptions';

describe('Retry Pattern', () => {
   beforeEach(() => {
      RetryPolicyRegistry.clear();
      jest.clearAllMocks();
   });

   describe('Backoff Strategies (GoF Strategy Pattern)', () => {
      describe('FixedBackoffStrategy', () => {
         it('should return constant delay for all attempts', () => {
            const strategy = new FixedBackoffStrategy(250);
            expect(strategy.getDelayMs(1)).toBe(250);
            expect(strategy.getDelayMs(2)).toBe(250);
            expect(strategy.getDelayMs(5)).toBe(250);
         });

         it('should handle zero or negative delays gracefully', () => {
            const strategy = new FixedBackoffStrategy(-50);
            expect(strategy.getDelayMs(1)).toBe(0);
         });
      });

      describe('LinearBackoffStrategy', () => {
         it('should linearly increase delay with each attempt up to maxDelayMs', () => {
            const strategy = new LinearBackoffStrategy({
               initialDelayMs: 100,
               incrementMs: 150,
               maxDelayMs: 500,
            });

            expect(strategy.getDelayMs(1)).toBe(100);
            expect(strategy.getDelayMs(2)).toBe(250);
            expect(strategy.getDelayMs(3)).toBe(400);
            expect(strategy.getDelayMs(4)).toBe(500); // capped at maxDelayMs
            expect(strategy.getDelayMs(10)).toBe(500);
         });
      });

      describe('ExponentialBackoffStrategy', () => {
         it('should compute exact deterministic exponential backoff when jitter is none', () => {
            const strategy = new ExponentialBackoffStrategy({
               initialDelayMs: 100,
               multiplier: 2,
               maxDelayMs: 1000,
               jitter: JITTER_TYPES.NONE,
            });

            expect(strategy.getDelayMs(1)).toBe(100);
            expect(strategy.getDelayMs(2)).toBe(200);
            expect(strategy.getDelayMs(3)).toBe(400);
            expect(strategy.getDelayMs(4)).toBe(800);
            expect(strategy.getDelayMs(5)).toBe(1000); // capped at 1000
         });

         it('should stay within [0, baseDelay] bounds when jitter is full', () => {
            const strategy = new ExponentialBackoffStrategy({
               initialDelayMs: 200,
               multiplier: 2,
               maxDelayMs: 2000,
               jitter: JITTER_TYPES.FULL,
            });

            for (let i = 1; i <= 5; i++) {
               const delay = strategy.getDelayMs(i);
               expect(delay).toBeGreaterThanOrEqual(0);
               expect(delay).toBeLessThanOrEqual(2000);
            }
         });

         it('should stay within [baseDelay / 2, baseDelay] when jitter is equal', () => {
            const strategy = new ExponentialBackoffStrategy({
               initialDelayMs: 100,
               multiplier: 2,
               maxDelayMs: 1000,
               jitter: JITTER_TYPES.EQUAL,
            });

            const delay1 = strategy.getDelayMs(1);
            expect(delay1).toBeGreaterThanOrEqual(50);
            expect(delay1).toBeLessThanOrEqual(100);
         });

         it('should support decorrelated jitter and boolean flag', () => {
            const strategyDecorrelated = new ExponentialBackoffStrategy({
               initialDelayMs: 50,
               maxDelayMs: 500,
               jitter: JITTER_TYPES.DECORRELATED,
            });
            expect(strategyDecorrelated.getDelayMs(1)).toBeLessThanOrEqual(500);

            const strategyBool = new ExponentialBackoffStrategy({
               initialDelayMs: 50,
               jitter: false,
            });
            expect(strategyBool.getDelayMs(1)).toBe(50);
         });
      });
   });

   describe('isGrpcRetryable Predicate', () => {
      it('should return false for null or undefined', () => {
         expect(isGrpcRetryable(null)).toBe(false);
         expect(isGrpcRetryable(undefined)).toBe(false);
      });

      it('should return false if CircuitBreaker is OPEN to fail fast', () => {
         const breakerOpenErr = new CircuitBreakerOpenException('auth-service', 10000);
         expect(isGrpcRetryable(breakerOpenErr)).toBe(false);
         expect(isGrpcRetryable({ name: RESILIENCE_ERROR_NAMES.CIRCUIT_BREAKER_OPEN })).toBe(false);
      });

      it('should return true for TimeoutException and TIMEOUT_ERROR_NAMES', () => {
         expect(isGrpcRetryable(new TimeoutException())).toBe(true);
         for (const timeoutName of TIMEOUT_ERROR_NAMES) {
            expect(isGrpcRetryable({ name: timeoutName })).toBe(true);
         }
      });

      it('should return true for transient gRPC status codes', () => {
         for (const code of RETRYABLE_GRPC_STATUS_CODES) {
            expect(isGrpcRetryable({ code })).toBe(true);
         }
      });

      it('should return false for non-retryable gRPC status codes', () => {
         for (const code of NON_RETRYABLE_GRPC_STATUS_CODES) {
            expect(isGrpcRetryable({ code })).toBe(false);
         }
      });

      it('should return true for all registered Node NETWORK_ERROR_CODES', () => {
         for (const code of NETWORK_ERROR_CODES) {
            expect(isGrpcRetryable({ code })).toBe(true);
         }
      });

      it('should return true for transient HTTP status codes in RETRYABLE_HTTP_STATUS_CODES', () => {
         for (const statusCode of RETRYABLE_HTTP_STATUS_CODES) {
            expect(isGrpcRetryable({ statusCode })).toBe(true);
         }
      });

      it('should return false for business 4xx client errors', () => {
         expect(isGrpcRetryable(new BadRequestException())).toBe(false);
         expect(isGrpcRetryable({ statusCode: 400 })).toBe(false);
         expect(isGrpcRetryable({ statusCode: 404 })).toBe(false);
         expect(isGrpcRetryable({ statusCode: 409 })).toBe(false);
      });

      it('should return true for raw error messages containing transient keywords', () => {
         expect(isGrpcRetryable(new Error('14 UNAVAILABLE: connection refused'))).toBe(true);
         expect(isGrpcRetryable(new Error('4 DEADLINE_EXCEEDED: socket timed out'))).toBe(true);
         expect(isGrpcRetryable(new Error('read ECONNRESET'))).toBe(true);
      });
   });

   describe('RetryPolicy.execute (Promises)', () => {
      it('should return result on first attempt when no error occurs', async () => {
         const policy = new RetryPolicy({ name: 'test-policy', maxAttempts: 3 });
         const mockFn = jest.fn().mockResolvedValue('success');

         const result = await policy.execute(mockFn);

         expect(result).toBe('success');
         expect(mockFn).toHaveBeenCalledTimes(1);

         const stats = policy.getStats();
         expect(stats.totalCalls).toBe(1);
         expect(stats.successfulCalls).toBe(1);
         expect(stats.failedCalls).toBe(0);
         expect(stats.totalRetries).toBe(0);
      });

      it('should retry on transient error and return result once successful', async () => {
         const onRetry = jest.fn();
         const policy = new RetryPolicy({
            name: 'retry-test',
            maxAttempts: 3,
            backoff: new FixedBackoffStrategy(1),
            onRetry,
         });

         const mockFn = jest
            .fn()
            .mockRejectedValueOnce({ code: GrpcStatus.UNAVAILABLE, message: 'down' })
            .mockResolvedValueOnce('recovered');

         const result = await policy.execute(mockFn);

         expect(result).toBe('recovered');
         expect(mockFn).toHaveBeenCalledTimes(2);
         expect(onRetry).toHaveBeenCalledTimes(1);
         expect(onRetry).toHaveBeenCalledWith(
            expect.objectContaining({
               attempt: 1,
               maxAttempts: 3,
               policyName: 'retry-test',
            }),
         );

         const stats = policy.getStats();
         expect(stats.successfulCalls).toBe(1);
         expect(stats.totalRetries).toBe(1);
      });

      it('should exhaust retries and throw error when error persists', async () => {
         const policy = new RetryPolicy({
            name: 'exhaust-test',
            maxAttempts: 3,
            backoff: new FixedBackoffStrategy(1),
         });

         const persistentError = { code: GrpcStatus.UNAVAILABLE, message: 'persistent outage' };
         const mockFn = jest.fn().mockRejectedValue(persistentError);

         await expect(policy.execute(mockFn)).rejects.toEqual(persistentError);
         expect(mockFn).toHaveBeenCalledTimes(3);

         const stats = policy.getStats();
         expect(stats.failedCalls).toBe(1);
         expect(stats.exhaustedRetries).toBe(1);
         expect(stats.totalRetries).toBe(2);
      });

      it('should fail fast without retrying on non-retryable error', async () => {
         const policy = new RetryPolicy({
            name: 'non-retry-test',
            maxAttempts: 3,
            backoff: new FixedBackoffStrategy(1),
         });

         const clientError = new BadRequestException('AUTH.INVALID_CREDENTIALS');
         const mockFn = jest.fn().mockRejectedValue(clientError);

         await expect(policy.execute(mockFn)).rejects.toThrow(BadRequestException);
         expect(mockFn).toHaveBeenCalledTimes(1);

         const stats = policy.getStats();
         expect(stats.nonRetryableAborts).toBe(1);
         expect(stats.totalRetries).toBe(0);
      });

      it('should timeout individual attempts when timeoutPerAttemptMs is set', async () => {
         const policy = new RetryPolicy({
            name: 'timeout-test',
            maxAttempts: 2,
            timeoutPerAttemptMs: 20,
            backoff: new FixedBackoffStrategy(1),
         });

         const slowFn = jest.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

         await expect(policy.execute(slowFn)).rejects.toThrow(TimeoutException);
         expect(slowFn).toHaveBeenCalledTimes(2);
      });
   });

   describe('RetryPolicy.executeObservable & withGrpcRetry (RxJS)', () => {
      it('should emit successfully on first attempt for Observable', (done) => {
         const policy = new RetryPolicy({ name: 'obs-test', maxAttempts: 3 });

         of('value')
            .pipe(policy.executeObservable.bind(policy))
            .subscribe({
               next: (val) => {
                  expect(val).toBe('value');
                  done();
               },
               error: done,
            });
      });

      it('should recover using withGrpcRetry operator when transient error occurs', (done) => {
         let callCount = 0;
         const source$ = defer(() => {
            callCount++;
            if (callCount === 1) {
               return throwError(() => ({ code: GrpcStatus.UNAVAILABLE, message: 'down' }));
            }
            return of('recovered-val');
         });

         source$
            .pipe(
               withGrpcRetry({
                  name: 'obs-retry',
                  maxAttempts: 3,
                  backoff: new FixedBackoffStrategy(1),
               }),
            )
            .subscribe({
               next: (val) => {
                  expect(val).toBe('recovered-val');
                  expect(callCount).toBe(2);
                  done();
               },
               error: done,
            });
      });

      it('should fail fast on non-retryable error for Observable', (done) => {
         let callCount = 0;
         const source$ = defer(() => {
            callCount++;
            return throwError(() => ({ code: GrpcStatus.INVALID_ARGUMENT, message: 'invalid' }));
         });

         source$
            .pipe(
               withGrpcRetry({
                  name: 'obs-fast-fail',
                  maxAttempts: 3,
                  backoff: new FixedBackoffStrategy(1),
               }),
            )
            .subscribe({
               next: () => done(new Error('Should not succeed')),
               error: (err) => {
                  expect(err.code).toBe(GrpcStatus.INVALID_ARGUMENT);
                  expect(callCount).toBe(1);
                  done();
               },
            });
      });
   });

   describe('RetryPolicyBuilder (GoF Builder Pattern)', () => {
      it('should build configured RetryPolicy through fluent API', () => {
         const customPredicate = jest.fn().mockReturnValue(true);
         const onRetryCb = jest.fn();

         const policy = RetryPolicy.builder()
            .name('fluent-policy')
            .maxAttempts(4)
            .exponentialBackoff({ initialDelayMs: 50, maxDelayMs: 500, jitter: 'none' })
            .retryOn(customPredicate)
            .timeoutPerAttempt(1000)
            .onRetry(onRetryCb)
            .build();

         expect(policy).toBeInstanceOf(RetryPolicy);
         expect(policy.name).toBe('fluent-policy');
      });

      it('should build policy with fixed and linear backoff', () => {
         const fixedPolicy = RetryPolicy.builder().name('fixed').fixedBackoff(300).build();
         expect(fixedPolicy).toBeInstanceOf(RetryPolicy);

         const linearPolicy = RetryPolicy.builder().name('linear').linearBackoff(100, 50, 1000).build();
         expect(linearPolicy).toBeInstanceOf(RetryPolicy);
      });
   });

   describe('RetryPolicyRegistry (Registry / Factory Pattern)', () => {
      it('should getOrCreate, cache, and retrieve singleton instances by name', () => {
         const policy1 = RetryPolicyRegistry.getOrCreate('user-service-retry', { maxAttempts: 5 });
         const policy2 = RetryPolicyRegistry.getOrCreate('user-service-retry');

         expect(policy1).toBe(policy2);
         expect(RetryPolicyRegistry.get('user-service-retry')).toBe(policy1);

         const all = RetryPolicyRegistry.getAll();
         expect(all.size).toBe(1);

         RetryPolicyRegistry.clear();
         expect(RetryPolicyRegistry.getAll().size).toBe(0);
      });
   });

   describe('createGrpcRetryChannelOptions (gRPC Service Config)', () => {
      it('should generate valid gRPC service config options for channel', () => {
         const channelOpts = createGrpcRetryChannelOptions({
            maxAttempts: 4,
            initialBackoff: '0.2s',
            maxBackoff: '2s',
            backoffMultiplier: 2,
            serviceNames: ['auth.v1.AuthService'],
         });

         expect(channelOpts['grpc.enable_retries']).toBe(1);
         expect(typeof channelOpts['grpc.service_config']).toBe('string');

         const parsed = JSON.parse(channelOpts['grpc.service_config'] as string);
         expect(parsed.methodConfig[0].retryPolicy.maxAttempts).toBe(4);
         expect(parsed.methodConfig[0].name[0].service).toBe('auth.v1.AuthService');
      });
   });
});
