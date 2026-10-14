import { JwtUtil, type JwtPayload } from '@common/utils/jwt.util';
import {
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_KEY_ID,
} from '@common/constants/jwt.constant';

describe('JwtUtil (RS256)', () => {
   const testPayload: JwtPayload = {
      sub: '12345678-1234-1234-1234-123456789abc',
      email: 'john.doe@example.com',
      roles: ['user'],
      tokenType: 'access',
      jti: 'session-id-123',
   };

   describe('sign and verify', () => {
      it('should correctly sign and verify an RS256 token', () => {
         const token = JwtUtil.sign(testPayload, DEFAULT_DEV_RSA_PRIVATE_KEY, 3600);
         expect(typeof token).toBe('string');
         expect(token.split('.').length).toBe(3);

         const decoded = JwtUtil.verify(token, DEFAULT_DEV_RSA_PUBLIC_KEY);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
         expect(decoded.roles).toEqual(testPayload.roles);
         expect(decoded.tokenType).toBe(testPayload.tokenType);
      });

      it('should fail verification if signature does not match public key', () => {
         const { privateKey } = JwtUtil.generateKeyPair(2048);
         const tokenWithDifferentKey = JwtUtil.sign(testPayload, privateKey, 3600);

         expect(() => {
            JwtUtil.verify(tokenWithDifferentKey, DEFAULT_DEV_RSA_PUBLIC_KEY);
         }).toThrow();
      });
   });

   describe('JWKS generation', () => {
      it('should generate valid JWKS with kid and alg', () => {
         const jwks = JwtUtil.generateJwks(DEFAULT_DEV_RSA_PUBLIC_KEY, DEFAULT_JWT_KEY_ID);
         expect(jwks.keys).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys.length).toBe(1);

         const key = jwks.keys[0];
         expect(key.kid).toBe(DEFAULT_JWT_KEY_ID);
         expect(key.alg).toBe('RS256');
         expect(key.use).toBe('sig');
         expect(key.kty).toBe('RSA');
         expect(key.n).toBeDefined();
         expect(key.e).toBeDefined();
      });
   });
});
