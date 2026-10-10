import { z } from 'zod';
import { sharedEnvSchema, DEFAULT_JWT_KEY_ID } from '@common';

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
