import { JwtUtil, type JwtPayload } from '@common/utils/jwt.util';
import {
   DEFAULT_DEV_EC_PRIVATE_KEY,
   DEFAULT_DEV_EC_PUBLIC_KEY,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_ALGORITHM,
   DEFAULT_JWT_KEY_ID,
   JWT_ALGORITHM,
} from '@common/constants/jwt.constant';

describe('JwtUtil (ECDSA ES256 & Backward Compatibility)', () => {
   const testPayload: JwtPayload = {
      sub: '12345678-1234-1234-1234-123456789abc',
      email: 'john.doe@example.com',
      roles: ['user'],
      tokenType: 'access',
      jti: 'session-id-123',
   };

   describe('ECDSA ES256 sign and verify', () => {
      it('should correctly sign and verify an ES256 token using NIST P-256 keys', () => {
         const token = JwtUtil.sign(testPayload, DEFAULT_DEV_EC_PRIVATE_KEY, 3600);
         expect(typeof token).toBe('string');
         expect(token.split('.').length).toBe(3);

         const decodedHeader = JwtUtil.decode(token, { json: true });
         expect(decodedHeader).toBeDefined();

         const decoded = JwtUtil.verify(token, DEFAULT_DEV_EC_PUBLIC_KEY);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
         expect(decoded.roles).toEqual(testPayload.roles);
         expect(decoded.tokenType).toBe(testPayload.tokenType);
      });

      it('should produce a significantly smaller token with ES256 compared to RS256', () => {
         const es256Token = JwtUtil.sign(testPayload, DEFAULT_DEV_EC_PRIVATE_KEY, 3600);
         const rs256Token = JwtUtil.sign(testPayload, DEFAULT_DEV_RSA_PRIVATE_KEY, 3600, {
            algorithm: JWT_ALGORITHM.RS256,
         });

         // ECDSA P-256 signature is exactly 64 bytes (86 base64url chars) vs RSA-2048 signature of 256 bytes (342 base64url chars)
         const es256Sig = es256Token.split('.')[2];
         const rs256Sig = rs256Token.split('.')[2];
         expect(es256Sig.length).toBeLessThanOrEqual(86);
         expect(rs256Sig.length).toBe(342);
         expect(es256Token.length).toBeLessThan(rs256Token.length);
      });

      it('should fail verification if signature does not match public key', () => {
         const { privateKey } = JwtUtil.generateEcKeyPair('prime256v1');
         const tokenWithDifferentKey = JwtUtil.sign(testPayload, privateKey, 3600);

         expect(() => {
            JwtUtil.verify(tokenWithDifferentKey, DEFAULT_DEV_EC_PUBLIC_KEY);
         }).toThrow();
      });
   });

   describe('JWKS generation and Key Conversion', () => {
      it('should generate valid EC JWKS with crv P-256 and coordinates (x, y)', () => {
         const jwks = JwtUtil.generateJwks(DEFAULT_DEV_EC_PUBLIC_KEY, DEFAULT_JWT_KEY_ID);
         expect(jwks.keys).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys.length).toBe(1);

         const key = jwks.keys[0];
         expect(key.kid).toBe(DEFAULT_JWT_KEY_ID);
         expect(key.alg).toBe(DEFAULT_JWT_ALGORITHM);
         expect(key.use).toBe('sig');
         expect(key.kty).toBe('EC');
         expect(key.crv).toBe('P-256');
         expect(key.x).toBeDefined();
         expect(key.y).toBeDefined();
      });

      it('should roundtrip convert EC PEM to JWK and back to PEM', () => {
         const jwk = JwtUtil.pemToJwk(DEFAULT_DEV_EC_PUBLIC_KEY, 'test-key', JWT_ALGORITHM.ES256);
         expect(jwk.kty).toBe('EC');
         expect(jwk.crv).toBe('P-256');

         const pem = JwtUtil.jwkToPem(jwk);
         expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
         expect(JwtUtil.formatPemKey(pem)).toBe(JwtUtil.formatPemKey(DEFAULT_DEV_EC_PUBLIC_KEY));
      });

      it('should verify token directly using JWKS response object', () => {
         const jwks = JwtUtil.generateJwks(DEFAULT_DEV_EC_PUBLIC_KEY, DEFAULT_JWT_KEY_ID);
         const token = JwtUtil.sign(testPayload, DEFAULT_DEV_EC_PRIVATE_KEY, 3600, {
            keyid: DEFAULT_JWT_KEY_ID,
         });

         const decoded = JwtUtil.verify(token, jwks);
         expect(decoded.sub).toBe(testPayload.sub);
      });
   });

   describe('Backward Compatibility & Zero-Downtime Rollout', () => {
      it('should correctly sign and verify legacy RS256 token', () => {
         const token = JwtUtil.sign(testPayload, DEFAULT_DEV_RSA_PRIVATE_KEY, 3600);
         const decoded = JwtUtil.verify(token, DEFAULT_DEV_RSA_PUBLIC_KEY);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
      });

      it('should verify legacy RS256 token seamlessly via zero-downtime fallback', () => {
         const legacyRs256Token = JwtUtil.sign(testPayload, DEFAULT_DEV_RSA_PRIVATE_KEY, 3600);

         // Pass default EC public key, fallback gracefully handles RS256 token
         const decoded = JwtUtil.verify(legacyRs256Token, DEFAULT_DEV_EC_PUBLIC_KEY);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
      });

      it('should verify both ES256 and RS256 tokens using a multi-key JWKS set', () => {
         const multiJwks = JwtUtil.generateJwks([
            { publicKeyPem: DEFAULT_DEV_EC_PUBLIC_KEY, keyId: 'ec-key-1', alg: JWT_ALGORITHM.ES256 },
            { publicKeyPem: DEFAULT_DEV_RSA_PUBLIC_KEY, keyId: 'rsa-key-1', alg: JWT_ALGORITHM.RS256 },
         ]);

         const es256Token = JwtUtil.sign(testPayload, DEFAULT_DEV_EC_PRIVATE_KEY, 3600, {
            keyid: 'ec-key-1',
         });
         const rs256Token = JwtUtil.sign(testPayload, DEFAULT_DEV_RSA_PRIVATE_KEY, 3600, {
            keyid: 'rsa-key-1',
         });

         const decodedEc = JwtUtil.verify(es256Token, multiJwks);
         const decodedRsa = JwtUtil.verify(rs256Token, multiJwks);

         expect(decodedEc.sub).toBe(testPayload.sub);
         expect(decodedRsa.sub).toBe(testPayload.sub);
      });
   });
});
