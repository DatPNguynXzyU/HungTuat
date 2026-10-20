import { HealthIndicatorStatus } from '@common/constants/health.constant';

export { HealthIndicatorStatus };

/**
 * Structured health status result for an individual indicator probe.
 */
export interface HealthIndicatorResult {
   name: string;
   status: HealthIndicatorStatus;
   details?: Record<string, unknown>;
   error?: string;
}

/**
 * Strategy pattern interface for pluggable health indicators (e.g., Database, Redis, RabbitMQ).
 */
export interface IHealthIndicator {
   readonly name: string;
   check(): Promise<HealthIndicatorResult>;
}

/**
 * Injection token for multi-provider or array of health indicators.
 */
export const GRPC_HEALTH_INDICATORS = 'GRPC_HEALTH_INDICATORS';
