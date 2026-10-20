export const HEALTH_RESPONSE_MESSAGES = {
   HEALTH_CHECK_SUCCESS: 'HEALTH_CHECK_SUCCESS',
} as const;

export type HealthResponseMessage = (typeof HEALTH_RESPONSE_MESSAGES)[keyof typeof HEALTH_RESPONSE_MESSAGES];

/**
 * Standard health status values for service health check probes.
 */
export enum HealthStatus {
   OK = 'ok',
   ERROR = 'error',
}

/**
 * Connection state indicators for cache and datastore health probes.
 */
export enum CacheHealthState {
   UP = 'up',
   DOWN = 'down',
}

/**
 * Health indicator status states for strategy components.
 */
export enum HealthIndicatorStatus {
   UP = 'up',
   DOWN = 'down',
}

/**
 * Standard identifier names for health indicators.
 */
export const HEALTH_INDICATOR_NAMES = {
   DATABASE: 'database',
   POSTGRES: 'postgres',
   REDIS: 'redis',
   RABBITMQ: 'rabbitmq',
} as const;

export type HealthIndicatorName = (typeof HEALTH_INDICATOR_NAMES)[keyof typeof HEALTH_INDICATOR_NAMES];

/**
 * Default timeout durations in milliseconds for health indicator probes.
 */
export const HEALTH_INDICATOR_DEFAULTS = {
   DATABASE_TIMEOUT_MS: 3000,
   REDIS_TIMEOUT_MS: 2000,
} as const;
