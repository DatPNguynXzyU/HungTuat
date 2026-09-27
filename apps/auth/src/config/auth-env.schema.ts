import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const authEnvSchema = sharedEnvSchema.extend({
   POSTGRES_USER: z.string().default('postgres'),
   POSTGRES_PASSWORD: z.string().default('postgres'),
   POSTGRES_DB: z.string().default('omni_service_auth'),
   POSTGRES_PORT: z.coerce.number().int().positive().default(5433),
   DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5433/omni_service_auth'),
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
