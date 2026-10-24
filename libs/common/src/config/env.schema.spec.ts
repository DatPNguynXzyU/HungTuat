import { validateSharedEnv } from '@common/config/shared-env.schema';

describe('validateSharedEnv with Zod', () => {
   it('should parse and populate valid default values for empty config', () => {
      const result = validateSharedEnv({});
      expect(result.NODE_ENV).toBe('development');
      expect(result.SERVICE_NAME).toBe('omni-service');
      expect(result.LOG_LEVEL).toBe('info');
      expect(result.REDIS_HOST).toBe('localhost');
      expect(result.REDIS_PORT).toBe(6379);
   });

   it('should parse valid values correctly', () => {
      const result = validateSharedEnv({
         NODE_ENV: 'production',
         SERVICE_NAME: 'test-service',
         REDIS_PORT: '6380',
         JWT_PUBLIC_KEY: 'test-public-key',
      });
      expect(result.NODE_ENV).toBe('production');
      expect(result.SERVICE_NAME).toBe('test-service');
      expect(result.REDIS_PORT).toBe(6380);
      expect(result.JWT_ISSUER).toBe('omni-auth-service');
      expect(result.JWT_AUDIENCE).toBe('omni-microservices');
   });

   it('should throw fatal error when JWT key is missing in production', () => {
      expect(() => {
         validateSharedEnv({
            NODE_ENV: 'production',
            SERVICE_NAME: 'test-service',
         });
      }).toThrow('FATAL: JWT key missing in production');
   });

   it('should throw error when invalid enum or type is provided', () => {
      expect(() => {
         validateSharedEnv({
            NODE_ENV: 'invalid-environment',
         });
      }).toThrow('Shared environment validation error:');
   });
});
