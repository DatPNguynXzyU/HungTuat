import { z } from 'zod';

export const sharedEnvSchema = z.object({
   NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
   SERVICE_NAME: z.string().default('omni-service'),
   LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
   JWT_SECRET: z.string().default('default-super-secret-key'),
   JWT_REFRESH_SECRET: z.string().optional(),
   JWT_ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(900), // 15 minutes (900 seconds)
   JWT_REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(604800), // 7 days (604800 seconds)
   JWT_EXPIRES_IN: z.coerce.number().int().positive().default(900),
   COOKIE_NAME: z.string().default('access_token'),
   COOKIE_ACCESS_TOKEN_MAX_AGE: z.coerce.number().int().positive().default(900000), // 15 minutes in ms
   COOKIE_REFRESH_TOKEN_MAX_AGE: z.coerce.number().int().positive().default(604800000), // 7 days in ms
   RABBIT_MQ_URI: z.string().default('amqp://guest:guest@localhost:5672'),
   RABBITMQ_URI: z.string().optional(),
   RABBIT_MQ_AUTH_SERVICE_QUEUE: z.string().default('auth_queue'),
   RABBIT_MQ_USER_SERVICE_QUEUE: z.string().default('user_queue'),
   RABBIT_MQ_ORDER_SERVICE_QUEUE: z.string().default('order_queue'),
   REDIS_HOST: z.string().default('localhost'),
   REDIS_PORT: z.coerce.number().int().positive().default(6379),
   REDIS_PASSWORD: z.string().optional(),
});

export type SharedEnvConfig = z.infer<typeof sharedEnvSchema>;

export function validateSharedEnv(config: Record<string, unknown>): SharedEnvConfig {
   const parsed = sharedEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`Shared environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
