import { z } from 'zod';
import { sharedEnvSchema } from '@common';
import { DEFAULT_JWT_KEY_ID } from '@contracts/auth';

export const AUTH_ENV_KEYS = {
   ARGON2_SECRET: 'ARGON2_SECRET',
   ARGON2_SALT: 'ARGON2_SALT',
   PORT: 'PORT',
} as const;

export type AuthEnvKey = (typeof AUTH_ENV_KEYS)[keyof typeof AUTH_ENV_KEYS];

export const authEnvSchema = sharedEnvSchema.extend({
   SERVICE_NAME: z.string().default('auth-service'),
   POSTGRES_USER: z.string().default('postgres'),
   POSTGRES_PASSWORD: z.string().default('postgres'),
   POSTGRES_DB: z.string().default('omni_service_auth'),
   POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
   DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5433/omni_service_auth'),
   JWT_PRIVATE_KEY_PATH: z.string().default('apps/auth/keys/private.key'),
   JWT_PUBLIC_KEY_PATH: z.string().default('apps/auth/keys/public.key'),
   JWT_KEY_ID: z.string().default(DEFAULT_JWT_KEY_ID),
   ARGON2_SECRET: z.string().default('default-argon2-secret-key'),
   ARGON2_SALT: z.string().default('default-argon2-salt-key'),
   PORT: z.coerce.number().int().positive().default(3001),
});

export type AuthEnvConfig = z.infer<typeof authEnvSchema>;

export function validateAuthEnv(config: Record<string, unknown>): AuthEnvConfig {
   const parsed = authEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`Auth environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
