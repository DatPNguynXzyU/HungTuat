import { z } from 'zod';
import { DEFAULT_JWT_ALGORITHM, DEFAULT_JWT_KEY_ID } from '@common/constants/jwt.constant';

export const sharedEnvSchema = z.object({
   NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
   SERVICE_NAME: z.string().default('omni-service'),
   LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
   JWT_PUBLIC_KEY_PATH: z.string().optional(),
   JWT_PRIVATE_KEY_PATH: z.string().optional(),
   JWT_PUBLIC_KEY: z.string().optional(),
   JWT_PRIVATE_KEY: z.string().optional(),
   JWT_KEY_ID: z.string().default(DEFAULT_JWT_KEY_ID),
   JWT_ALGORITHM: z.string().default(DEFAULT_JWT_ALGORITHM),
   JWT_SECRET: z.string().optional(),
   JWT_REFRESH_SECRET: z.string().optional(),
   ARGON2_SECRET: z.string().default('default-argon2-secret-key'),
   ARGON2_SALT: z.string().default('default-argon2-salt-key'),
   JWT_ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(900),
   JWT_REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive().default(604800),
   JWT_EXPIRES_IN: z.coerce.number().int().positive().default(900),
   COOKIE_NAME: z.string().default('access_token'),
   COOKIE_ACCESS_TOKEN_MAX_AGE: z.coerce.number().int().positive().default(900000),
   COOKIE_REFRESH_TOKEN_MAX_AGE: z.coerce.number().int().positive().default(604800000),
   RABBIT_MQ_URI: z.string().default('amqp://guest:guest@localhost:5672'),
   RABBITMQ_URI: z.string().optional(),
   RABBIT_MQ_AUTH_SERVICE_QUEUE: z.string().default('auth_queue'),
   RABBIT_MQ_USER_SERVICE_QUEUE: z.string().default('user_queue'),
   RABBIT_MQ_ORDER_SERVICE_QUEUE: z.string().default('order_queue'),
   RABBIT_MQ_NOTIFICATION_SERVICE_QUEUE: z.string().default('notification_queue'),
   REDIS_HOST: z.string().default('localhost'),
   REDIS_PORT: z.coerce.number().int().positive().default(6379),
   REDIS_PASSWORD: z.string().optional(),
   NEBULA_GRAPHD_HOST: z.string().default('localhost'),
   NEBULA_GRAPHD_PORT: z.coerce.number().int().positive().default(9669),
   NEBULA_USERNAME: z.string().default('root'),
   NEBULA_PASSWORD: z.string().default('nebula'),
   NEBULA_SPACE: z.string().default('social_graph'),
   ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
   ELASTICSEARCH_PORT: z.coerce.number().int().positive().default(9200),
   ELASTICSEARCH_USERNAME: z.string().optional(),
   ELASTICSEARCH_PASSWORD: z.string().optional(),
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
