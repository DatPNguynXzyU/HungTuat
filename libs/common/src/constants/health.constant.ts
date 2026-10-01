export const HEALTH_RESPONSE_MESSAGES = {
   HEALTH_CHECK_SUCCESS: 'HEALTH_CHECK_SUCCESS',
} as const;

export type HealthResponseMessage = (typeof HEALTH_RESPONSE_MESSAGES)[keyof typeof HEALTH_RESPONSE_MESSAGES];
