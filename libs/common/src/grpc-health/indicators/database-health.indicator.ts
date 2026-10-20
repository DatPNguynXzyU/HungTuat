import { Injectable, Logger } from '@nestjs/common';
import { HEALTH_INDICATOR_DEFAULTS, HEALTH_INDICATOR_NAMES } from '@common/constants/health.constant';
import {
   HealthIndicatorStatus,
   type HealthIndicatorResult,
   type IHealthIndicator,
} from '@common/grpc-health/interfaces/health-indicator.interface';

export interface DatabasePingable {
   $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

/**
 * Concrete strategy indicator for verifying database connectivity.
 * Supports PrismaClient or any client providing a ping callback.
 */
@Injectable()
export class DatabaseHealthIndicator implements IHealthIndicator {
   readonly name: string;
   private readonly logger = new Logger(DatabaseHealthIndicator.name);
   private readonly pingFn: () => Promise<unknown>;
   private readonly timeoutMs: number;

   constructor(
      name: string = HEALTH_INDICATOR_NAMES.DATABASE,
      pingFn: () => Promise<unknown>,
      timeoutMs: number = HEALTH_INDICATOR_DEFAULTS.DATABASE_TIMEOUT_MS,
   ) {
      this.name = name;
      this.pingFn = pingFn;
      this.timeoutMs = timeoutMs;
   }

   /**
    * Factory method to create an indicator from a PrismaClient instance.
    */
   static fromPrisma(
      prisma: DatabasePingable,
      name: string = HEALTH_INDICATOR_NAMES.DATABASE,
      timeoutMs: number = HEALTH_INDICATOR_DEFAULTS.DATABASE_TIMEOUT_MS,
   ): DatabaseHealthIndicator {
      return new DatabaseHealthIndicator(name, () => prisma.$queryRaw`SELECT 1`, timeoutMs);
   }

   async check(): Promise<HealthIndicatorResult> {
      const startTime = Date.now();
      let timer: NodeJS.Timeout | undefined;
      try {
         await Promise.race([
            this.pingFn(),
            new Promise((_, reject) => {
               timer = setTimeout(
                  () => reject(new Error(`Database health check timed out after ${this.timeoutMs}ms`)),
                  this.timeoutMs,
               );
               if (typeof timer.unref === 'function') {
                  timer.unref();
               }
            }),
         ]);

         const latency = Date.now() - startTime;
         return {
            name: this.name,
            status: HealthIndicatorStatus.UP,
            details: { latencyMs: latency },
         };
      } catch (error: unknown) {
         const errorMessage = error instanceof Error ? error.message : String(error);
         this.logger.error(`Database health check failed for '${this.name}': ${errorMessage}`);
         return {
            name: this.name,
            status: HealthIndicatorStatus.DOWN,
            error: errorMessage,
         };
      } finally {
         if (timer) {
            clearTimeout(timer);
         }
      }
   }
}
