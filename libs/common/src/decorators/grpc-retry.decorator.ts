import { defer, from, isObservable } from 'rxjs';
import { RetryPolicy, RetryPolicyOptions, RetryPolicyRegistry, withGrpcRetry } from '@common/patterns/retry.pattern';

/**
 * Method decorator that wraps async or Observable methods with the Retry Pattern (GoF Decorator Pattern).
 * Protects Gateway and callers from transient network errors, socket blips, and downstream gRPC restarts.
 *
 * @param optionsOrPolicy - Retry policy instance, configuration object, or registered policy name.
 *
 * @example
 * ```typescript
 * class AuthService {
 *    @UseGrpcRetry({
 *       name: 'auth-grpc-check-email',
 *       maxAttempts: 3,
 *       initialDelayMs: 150,
 *       multiplier: 2,
 *    })
 *    async checkEmail(email: string) {
 *       return await firstValueFrom(
 *          this.authGrpcService.checkEmail({ email })
 *       );
 *    }
 * }
 * ```
 */
export function UseGrpcRetry(optionsOrPolicy: RetryPolicy | RetryPolicyOptions | string = {}): MethodDecorator {
   return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
      if (typeof originalMethod !== 'function') {
         return descriptor;
      }

      const defaultName = `${target.constructor?.name || 'Target'}.${String(propertyKey)}`;
      let policy: RetryPolicy;

      if (optionsOrPolicy instanceof RetryPolicy) {
         policy = optionsOrPolicy;
      } else if (typeof optionsOrPolicy === 'string') {
         policy = RetryPolicyRegistry.getOrCreate(optionsOrPolicy);
      } else {
         const name = optionsOrPolicy.name || defaultName;
         policy = RetryPolicyRegistry.getOrCreate(name, { ...optionsOrPolicy, name });
      }

      descriptor.value = function (this: unknown, ...args: unknown[]) {
         let executed = false;
         let firstResult: unknown;

         try {
            firstResult = originalMethod.apply(this, args);
            executed = true;
         } catch (syncErr) {
            return policy.execute(() => {
               if (!executed) {
                  return Promise.resolve(originalMethod.apply(this, args));
               }
               executed = false;
               const rejectErr = syncErr instanceof Error ? syncErr : new Error(String(syncErr));
               return Promise.reject(rejectErr);
            });
         }

         if (isObservable(firstResult)) {
            return defer(() => {
               if (executed) {
                  executed = false;
                  return firstResult;
               }
               const res = originalMethod.apply(this, args);
               return isObservable(res) ? res : from(Promise.resolve(res));
            }).pipe(withGrpcRetry(policy));
         }

         return policy.execute(() => {
            if (executed) {
               executed = false;
               return Promise.resolve(firstResult);
            }
            return Promise.resolve(originalMethod.apply(this, args));
         });
      };

      return descriptor;
   };
}
