import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const USER_ENV_KEYS = {
   PORT: 'PORT',
   SERVICE_NAME: 'SERVICE_NAME',
   POSTGRES_USER: 'POSTGRES_USER',
   POSTGRES_PASSWORD: 'POSTGRES_PASSWORD',
   POSTGRES_DB: 'POSTGRES_DB',
   POSTGRES_PORT: 'POSTGRES_PORT',
   DATABASE_URL: 'DATABASE_URL',
   NEBULA_GRAPHD_HOST: 'NEBULA_GRAPHD_HOST',
   NEBULA_GRAPHD_PORT: 'NEBULA_GRAPHD_PORT',
   NEBULA_USERNAME: 'NEBULA_USERNAME',
   NEBULA_PASSWORD: 'NEBULA_PASSWORD',
   NEBULA_SPACE: 'NEBULA_SPACE',
} as const;

export type UserEnvKey = (typeof USER_ENV_KEYS)[keyof typeof USER_ENV_KEYS];

export const userEnvSchema = sharedEnvSchema.extend({
   PORT: z.coerce.number().int().positive().default(3002),
   SERVICE_NAME: z.string().default('user-service'),
   POSTGRES_USER: z.string().default('postgres'),
   POSTGRES_PASSWORD: z.string().default('postgres'),
   POSTGRES_DB: z.string().default('omni_service_user'),
   POSTGRES_PORT: z.coerce.number().int().positive().default(5439),
   DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5439/omni_service_user'),
   NEBULA_GRAPHD_HOST: z.string().default('localhost'),
   NEBULA_GRAPHD_PORT: z.coerce.number().int().positive().default(9669),
   NEBULA_USERNAME: z.string().default('root'),
   NEBULA_PASSWORD: z.string().default('nebula'),
   NEBULA_SPACE: z.string().default('social_graph'),
});

export type UserEnvConfig = z.infer<typeof userEnvSchema>;

export function validateUserEnv(config: Record<string, unknown>): UserEnvConfig {
   const parsed = userEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`User environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
