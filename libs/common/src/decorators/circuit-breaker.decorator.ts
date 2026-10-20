import { CircuitBreakerOptions, CircuitBreakerRegistry } from '@common/patterns/circuit-breaker.pattern';

/**
 * Method decorator that wraps async class methods with the Circuit Breaker pattern.
 * Protects Gateway and callers from downstream latency spikes, network partitions, and cascading failure loops.
 *
 * @param options - Circuit breaker configuration or breaker name
 *
 * @example
 * ```typescript
 * class AuthService {
 *    @UseCircuitBreaker({
 *       name: 'auth-grpc-check-email',
 *       timeout: 3000,
 *       failureThreshold: 3,
 *       resetTimeout: 10000,
 *    })
 *    async checkEmail(email: string) {
 *       return await firstValueFrom(
 *          this.authGrpcService.checkEmail({ email })
 *       );
 *    }
 * }
 * ```
 */
export function UseCircuitBreaker(options: CircuitBreakerOptions | string = {}): MethodDecorator {
   return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;
      if (typeof originalMethod !== 'function') {
         return descriptor;
      }

      const defaultName = `${target.constructor?.name || 'Target'}.${String(propertyKey)}`;
      const breakerName = typeof options === 'string' ? options : options.name || defaultName;
      const breakerOptions: CircuitBreakerOptions =
         typeof options === 'string' ? { name: breakerName } : { ...options, name: breakerName };

      const breaker = CircuitBreakerRegistry.getOrCreate(breakerName, breakerOptions);

      descriptor.value = async function (this: unknown, ...args: unknown[]) {
         return breaker.execute(() => originalMethod.apply(this, args));
      };

      return descriptor;
   };
}
