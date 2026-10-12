import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const searchEnvSchema = sharedEnvSchema.extend({
   SERVICE_NAME: z.string().default('search-service'),
   ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
   ELASTICSEARCH_USERNAME: z.string().optional(),
   ELASTICSEARCH_PASSWORD: z.string().optional(),
   SEARCH_HTTP_PORT: z.coerce.number().int().positive().default(3003),
});

export type SearchEnvConfig = z.infer<typeof searchEnvSchema>;

export function validateSearchEnv(config: Record<string, unknown>): SearchEnvConfig {
   const parsed = searchEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`Search environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
