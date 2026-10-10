import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const postEnvSchema = sharedEnvSchema.extend({
   SERVICE_NAME: z.string().default('post-service'),
   POSTGRES_USER: z.string().default('postgres'),
   POSTGRES_PASSWORD: z.string().default('postgres'),
   POSTGRES_DB: z.string().default('omni_service_post'),
   POSTGRES_PORT: z.coerce.number().int().positive().default(5435),
   DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5435/omni_service_post'),
});

export type PostEnvConfig = z.infer<typeof postEnvSchema>;

export function validatePostEnv(config: Record<string, unknown>): PostEnvConfig {
   const parsed = postEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`Post environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
