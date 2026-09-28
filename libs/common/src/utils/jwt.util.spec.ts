import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_DEV_RSA_PRIVATE_KEY, DEFAULT_DEV_RSA_PUBLIC_KEY } from '@common/constants/jwt.constant';
import { JwtUtil } from '@common/utils/jwt.util';

describe('JwtUtil', () => {
   const privateKey = DEFAULT_DEV_RSA_PRIVATE_KEY;
   const publicKey = DEFAULT_DEV_RSA_PUBLIC_KEY;
   const testPayload = {
      sub: 'user-uuid-123',
      email: 'user@example.com',
      fullName: 'John Doe',
   };

   describe('sign and verify with RS256', () => {
      it('should sign a payload with RS256 private key and verify it with public key', () => {
         const token = JwtUtil.sign(testPayload, privateKey, 3600);
         expect(typeof token).toBe('string');
         expect(token.split('.').length).toBe(3);

         const decoded = JwtUtil.verify(token, publicKey);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
         expect(decoded.fullName).toBe(testPayload.fullName);
         expect(decoded.iat).toBeDefined();
         expect(decoded.exp).toBeDefined();
         expect(decoded.exp! - decoded.iat!).toBe(3600);
      });

      it('should set kid in header', () => {
         const token = JwtUtil.sign(testPayload, privateKey, 3600, { keyid: 'custom-kid' });
         const decoded = JwtUtil.decode(token, { complete: true }) as { header: { kid?: string; alg?: string } } | null;
         expect(decoded?.header.kid).toBe('custom-kid');
         expect(decoded?.header.alg).toBe('RS256');
      });

      it('should throw error when verifying with wrong public key', () => {
         const { publicKey: differentPublicKey } = JwtUtil.generateKeyPair();
         const token = JwtUtil.sign(testPayload, privateKey, 3600);
         expect(() => JwtUtil.verify(token, differentPublicKey)).toThrow();
      });

      it('should throw error when token is expired', () => {
         const token = JwtUtil.sign(testPayload, privateKey, -10);
         expect(() => JwtUtil.verify(token, publicKey)).toThrow();
      });

      it('should throw error when token is malformed', () => {
         expect(() => JwtUtil.verify('invalid.token.structure', publicKey)).toThrow();
      });
   });

   describe('decode', () => {
      it('should decode a token without signature verification', () => {
         const token = JwtUtil.sign(testPayload, privateKey, 3600);
         const decoded = JwtUtil.decode(token);

         expect(decoded).not.toBeNull();
         expect(decoded?.sub).toBe(testPayload.sub);
         expect(decoded?.email).toBe(testPayload.email);
      });

      it('should return null for invalid token string', () => {
         const decoded = JwtUtil.decode('not-a-valid-token');
         expect(decoded).toBeNull();
      });
   });

   describe('JWKS & Key Utilities', () => {
      it('should generate valid JWKS structure from public key', () => {
         const jwks = JwtUtil.generateJwks(publicKey, 'test-key-id');
         expect(jwks).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys.length).toBe(1);

         const key = jwks.keys[0];
         expect(key.kty).toBe('RSA');
         expect(key.use).toBe('sig');
         expect(key.alg).toBe('RS256');
         expect(key.kid).toBe('test-key-id');
         expect(key.n).toBeDefined();
         expect(key.e).toBe('AQAB');
      });

      it('should derive public key from private key correctly', () => {
         const derivedPublicKey = JwtUtil.derivePublicKey(privateKey);
         expect(derivedPublicKey).toContain('BEGIN PUBLIC KEY');

         const token = JwtUtil.sign(testPayload, privateKey, 3600);
         const decoded = JwtUtil.verify(token, derivedPublicKey);
         expect(decoded.sub).toBe(testPayload.sub);
      });

      it('should format PEM keys with escaped newlines or quotes', () => {
         const escapedKey = `"${publicKey.replace(/\n/g, '\\n')}"`;
         const formatted = JwtUtil.formatPemKey(escapedKey);
         expect(formatted).toBe(publicKey);
      });

      it('should read key from file correctly', () => {
         const tempDir = path.resolve(process.cwd(), 'tmp/test-keys');
         fs.mkdirSync(tempDir, { recursive: true });
         const keyPath = path.join(tempDir, 'test-pub.key');
         fs.writeFileSync(keyPath, publicKey);

         const readKey = JwtUtil.readKeyFile(keyPath);
         expect(readKey).toBe(publicKey);

         fs.rmSync(tempDir, { recursive: true, force: true });
      });

      it('should return null when reading non-existent file', () => {
         const readKey = JwtUtil.readKeyFile('non-existent-path/key.key');
         expect(readKey).toBeNull();
      });

      it('should loadKeyFromFile fallback when file does not exist', () => {
         const key = JwtUtil.loadKeyFromFile('non-existent-path/key.key', publicKey);
         expect(key).toBe(publicKey);
      });

      it('should generate key pair dynamically', () => {
         const pair = JwtUtil.generateKeyPair(2048);
         expect(pair.privateKey).toContain('BEGIN PRIVATE KEY');
         expect(pair.publicKey).toContain('BEGIN PUBLIC KEY');

         const token = JwtUtil.sign(testPayload, pair.privateKey, 1800);
         const verified = JwtUtil.verify(token, pair.publicKey);
         expect(verified.sub).toBe(testPayload.sub);
      });
   });
});
