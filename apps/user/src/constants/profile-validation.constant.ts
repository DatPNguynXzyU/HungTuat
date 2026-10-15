/**
 * Type-safe operation types for profile validation pipeline adhering to zero hardcoding rules.
 */
export const PROFILE_OPERATIONS = {
   CREATE: 'CREATE',
   UPDATE: 'UPDATE',
} as const;

export type ProfileOperation = (typeof PROFILE_OPERATIONS)[keyof typeof PROFILE_OPERATIONS];
