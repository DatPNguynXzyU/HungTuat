import { z } from 'zod';
import { sharedEnvSchema } from '@common';

export const notificationEnvSchema = sharedEnvSchema.extend({
   SERVICE_NAME: z.string().default('notification-service'),
   RESEND_TOKEN: z.string().default('default_resend_token'),
   RESEND_API_KEY: z.string().optional(),
   EMAIL_FROM: z.string().default('noreply@zeion.online'),
   EMAIL_FROM_NAME: z.string().default('OmniServices'),
   DATABASE_URL: z.string().optional(),
   POSTGRES_USER: z.string().optional(),
   POSTGRES_PASSWORD: z.string().optional(),
   POSTGRES_DB: z.string().optional(),
   POSTGRES_PORT: z.coerce.number().default(5436),
});

export type NotificationEnvConfig = z.infer<typeof notificationEnvSchema>;

export function validateNotificationEnv(config: Record<string, unknown>): NotificationEnvConfig {
   const parsed = notificationEnvSchema.safeParse(config);
   if (!parsed.success) {
      const formattedErrors = parsed.error.issues
         .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
         .join('\n');
      throw new Error(`Notification environment validation error:\n${formattedErrors}`);
   }
   return parsed.data;
}
