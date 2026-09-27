import { validateNotificationEnv } from '@notification/config/notification-env.schema';

describe('validateNotificationEnv', () => {
   it('should parse and populate valid default values for notification config', () => {
      const result = validateNotificationEnv({});
      expect(result.SERVICE_NAME).toBe('notification-service');
      expect(result.RESEND_TOKEN).toBe('default_resend_token');
      expect(result.EMAIL_FROM).toBe('noreply@zeion.online');
      expect(result.EMAIL_FROM_NAME).toBe('OmniServices');
   });

   it('should use custom values when provided', () => {
      const result = validateNotificationEnv({
         RESEND_TOKEN: 're_custom_token_123',
         EMAIL_FROM: 'support@zeion.online',
         EMAIL_FROM_NAME: 'Custom App',
      });
      expect(result.RESEND_TOKEN).toBe('re_custom_token_123');
      expect(result.EMAIL_FROM).toBe('support@zeion.online');
      expect(result.EMAIL_FROM_NAME).toBe('Custom App');
   });

   it('should throw error when invalid type is provided', () => {
      expect(() => {
         validateNotificationEnv({
            REDIS_PORT: 'invalid-port',
         });
      }).toThrow('Notification environment validation error:');
   });
});
