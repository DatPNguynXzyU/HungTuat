import { AuditSanitizerUtil } from '@common/utils/audit-sanitizer.util';

describe('AuditSanitizerUtil', () => {
   it('should redact sensitive password and token fields', () => {
      const input = {
         email: 'test@example.com',
         password: 'mySecretPassword123!',
         nested: {
            accessToken: 'jwt.token.string',
            apiKey: 'sk_live_123',
            safeField: 'hello',
         },
         tags: ['user', 'admin'],
      };

      const sanitized = AuditSanitizerUtil.sanitize(input);

      expect(sanitized).toEqual({
         email: 'test@example.com',
         password: '[REDACTED]',
         nested: {
            accessToken: '[REDACTED]',
            apiKey: '[REDACTED]',
            safeField: 'hello',
         },
         tags: ['user', 'admin'],
      });
   });

   it('should handle primitives and null values gracefully', () => {
      expect(AuditSanitizerUtil.sanitize(null)).toBeNull();
      expect(AuditSanitizerUtil.sanitize(undefined)).toBeUndefined();
      expect(AuditSanitizerUtil.sanitize('plain text')).toBe('plain text');
      expect(AuditSanitizerUtil.sanitize(12345)).toBe(12345);
   });
});
