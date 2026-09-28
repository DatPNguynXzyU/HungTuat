export class AuditSanitizerUtil {
   private static readonly SENSITIVE_KEYS = new Set([
      'password',
      'currentpassword',
      'newpassword',
      'oldpassword',
      'passwordhash',
      'token',
      'accesstoken',
      'refreshtoken',
      'secret',
      'authorization',
      'apikey',
      'privatekey',
      'creditcard',
      'cardnumber',
      'cvv',
      'otp',
      'pin',
   ]);

   /**
    * Deep sanitize an object or primitive to strip out sensitive data according to GDPR & SOC 2 data minimization principles.
    */
   static sanitize<T>(input: T): T {
      if (input === null || input === undefined) {
         return input;
      }

      if (typeof input !== 'object') {
         return input;
      }

      if (Array.isArray(input)) {
         return input.map((item: unknown) => this.sanitize(item)) as unknown as T;
      }

      const result: Record<string, unknown> = {};
      const obj = input as Record<string, unknown>;

      for (const key of Object.keys(obj)) {
         const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
         if (this.SENSITIVE_KEYS.has(normalizedKey)) {
            result[key] = '[REDACTED]';
         } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            result[key] = this.sanitize(obj[key]);
         } else {
            result[key] = obj[key];
         }
      }

      return result as unknown as T;
   }
}
