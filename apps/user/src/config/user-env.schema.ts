import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const userEnvSchema = sharedEnvSchema.extend({
   SERVICE_NAME: z.string().default('user-service'),
   POSTGRES_USER: z.string().default('postgres'),
   POSTGRES_PASSWORD: z.string().default('postgres'),
   POSTGRES_DB: z.string().default('omni_service_user'),
   POSTGRES_PORT: z.coerce.number().int().positive().default(5439),
   DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5439/omni_service_user'),
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
