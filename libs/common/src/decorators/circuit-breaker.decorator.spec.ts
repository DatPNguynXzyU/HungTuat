import { UseCircuitBreaker } from '@common/decorators/circuit-breaker.decorator';
import { CircuitBreakerOpenException, CircuitBreakerRegistry } from '@common/patterns/circuit-breaker.pattern';
import { HealthIndicatorStatus } from '@common/constants/health.constant';

class TestConsumerService {
   @UseCircuitBreaker({
      name: 'test-consumer-service',
      failureThreshold: 2,
      resetTimeout: 100,
   })
   async callDownstream(shouldFail = false): Promise<string> {
      await Promise.resolve();
      if (shouldFail) {
         throw new Error(HealthIndicatorStatus.DOWN);
      }
      return 'success';
   }
}

describe('UseCircuitBreaker Decorator', () => {
   let service: TestConsumerService;

   beforeEach(() => {
      CircuitBreakerRegistry.clear();
      service = new TestConsumerService();
   });

   it('should execute decorated method normally when circuit is closed', async () => {
      const result = await service.callDownstream(false);
      expect(result).toBe('success');
   });

   it('should trip the circuit after failureThreshold is reached and fail fast', async () => {
      await expect(service.callDownstream(true)).rejects.toThrow(HealthIndicatorStatus.DOWN);
      await expect(service.callDownstream(true)).rejects.toThrow(HealthIndicatorStatus.DOWN);

      // 3rd call should immediately fail with CircuitBreakerOpenException
      await expect(service.callDownstream(false)).rejects.toThrow(CircuitBreakerOpenException);
   });
});
