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
