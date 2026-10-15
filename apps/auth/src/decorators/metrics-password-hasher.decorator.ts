import { Inject, Injectable } from '@nestjs/common';
import { AUTH_METRICS_SERVICE, type IAuthMetricsService } from '@auth/services/infrastructure/auth-metrics.interface';
import type { IPasswordHasher } from '@auth/services/infrastructure/password-hasher.interface';

/**
 * Decorator Pattern: MetricsPasswordHasherDecorator
 *
 * Transparently wraps IPasswordHasher to record password hashing duration
 * without polluting domain or application services with timer logic.
 */
@Injectable()
export class MetricsPasswordHasherDecorator implements IPasswordHasher {
   constructor(
      private readonly inner: IPasswordHasher,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
   ) {}

   async hash(password: string): Promise<string> {
      const startTime = this.metricsService.startTimer();
      const hash = await this.inner.hash(password);
      this.metricsService.observePasswordHash(this.metricsService.calculateDuration(startTime));
      return hash;
   }

   verify(hashedPassword: string, candidate: string): Promise<boolean> {
      return this.inner.verify(hashedPassword, candidate);
   }
}
