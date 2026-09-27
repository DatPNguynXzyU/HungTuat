import { validateAuthEnv } from '@auth/config/auth-env.schema';

describe('validateAuthEnv', () => {
   it('should parse and populate valid default values for auth config', () => {
      const result = validateAuthEnv({});
      expect(result.POSTGRES_USER).toBe('postgres');
      expect(result.POSTGRES_DB).toBe('omni_service_auth');
      expect(result.POSTGRES_PORT).toBe(5433);
      expect(result.JWT_ACCESS_TOKEN_EXPIRES_IN).toBe(900);
      expect(result.JWT_REFRESH_TOKEN_EXPIRES_IN).toBe(604800);
   });

   it('should coerce string numbers correctly', () => {
      const result = validateAuthEnv({
         POSTGRES_PORT: '5434',
         JWT_ACCESS_TOKEN_EXPIRES_IN: '1800',
         JWT_REFRESH_TOKEN_EXPIRES_IN: '1209600',
      });
      expect(result.POSTGRES_PORT).toBe(5434);
      expect(result.JWT_ACCESS_TOKEN_EXPIRES_IN).toBe(1800);
      expect(result.JWT_REFRESH_TOKEN_EXPIRES_IN).toBe(1209600);
   });

   it('should throw error when invalid type is provided', () => {
      expect(() => {
         validateAuthEnv({
            POSTGRES_PORT: 'invalid-port',
         });
      }).toThrow('Auth environment validation error:');
   });
});
