import { validateGatewayEnv } from '@/config/gateway-env.schema';

describe('validateGatewayEnv', () => {
   it('should parse and populate valid default values for gateway config', () => {
      const result = validateGatewayEnv({});
      expect(result.PORT).toBe(8080);
      expect(result.GLOBAL_PREFIX).toBe('api/v1');
      expect(result.THROTTLE_SHORT_TTL).toBe(1000);
      expect(result.THROTTLE_SHORT_LIMIT).toBe(10);
   });

   it('should coerce string numbers correctly', () => {
      const result = validateGatewayEnv({
         PORT: '3000',
         THROTTLE_SHORT_TTL: '500',
      });
      expect(result.PORT).toBe(3000);
      expect(result.THROTTLE_SHORT_TTL).toBe(500);
   });

   it('should throw error when invalid type is provided', () => {
      expect(() => {
         validateGatewayEnv({
            PORT: 'invalid-port',
         });
      }).toThrow('Gateway environment validation error:');
   });
});
