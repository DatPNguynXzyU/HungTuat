/**
 * Standard Environment values and utility helpers
 */
export const NODE_ENV_VALUES = {
   DEVELOPMENT: 'development',
   PRODUCTION: 'production',
   TEST: 'test',
} as const;

export type NodeEnvValue = (typeof NODE_ENV_VALUES)[keyof typeof NODE_ENV_VALUES];

export const isProduction = (env?: string): boolean => env === NODE_ENV_VALUES.PRODUCTION;
export const isDevelopment = (env?: string): boolean => env === NODE_ENV_VALUES.DEVELOPMENT;
export const isTest = (env?: string): boolean => env === NODE_ENV_VALUES.TEST;
