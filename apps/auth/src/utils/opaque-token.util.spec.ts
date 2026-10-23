import { REFRESH_TOKEN_HEX_LENGTH } from '@auth/constants';
import { OpaqueTokenUtil } from '@auth/utils/opaque-token.util';

describe('OpaqueTokenUtil', () => {
   const secretKey = 'test-secret-key-for-unit-testing-32bytes';

   describe('format', () => {
      it('should format token as <jti>.<secret>', () => {
         expect(OpaqueTokenUtil.format('jti-123', 'secret-456')).toBe('jti-123.secret-456');
      });
   });

   describe('parse', () => {
      it('should parse valid opaque token correctly', () => {
         const secret = 'a'.repeat(REFRESH_TOKEN_HEX_LENGTH);
         const token = `018f3a5b-7c2a-7def-89ab-cdef01234567.${secret}`;
         const result = OpaqueTokenUtil.parse(token);

         expect(result).not.toBeNull();
         expect(result?.jti).toBe('018f3a5b-7c2a-7def-89ab-cdef01234567');
         expect(result?.secret).toBe(secret);
      });

      it('should return null for empty or non-string token', () => {
         expect(OpaqueTokenUtil.parse('')).toBeNull();
         expect(OpaqueTokenUtil.parse(null as unknown as string)).toBeNull();
      });

      it('should return null for token with incorrect number of parts', () => {
         expect(OpaqueTokenUtil.parse('singlepart')).toBeNull();
         expect(OpaqueTokenUtil.parse('part1.part2.part3')).toBeNull();
      });

      it('should return null if secret is not 64 hex characters', () => {
         expect(OpaqueTokenUtil.parse('jti.short')).toBeNull();
         expect(OpaqueTokenUtil.parse(`jti.${'z'.repeat(REFRESH_TOKEN_HEX_LENGTH)}`)).toBeNull();
      });
   });

   describe('generateSecret', () => {
      it('should generate a 64 hex characters random secret', () => {
         const secret = OpaqueTokenUtil.generateSecret();
         expect(secret).toHaveLength(REFRESH_TOKEN_HEX_LENGTH);
         expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
      });
   });

   describe('hashSecret and verifyHash', () => {
      it('should compute HMAC-SHA256 and verify matching hash in constant time', () => {
         const secret = OpaqueTokenUtil.generateSecret();
         const hash = OpaqueTokenUtil.hashSecret(secret, secretKey);

         expect(typeof hash).toBe('string');
         expect(OpaqueTokenUtil.verifyHash(hash, hash)).toBe(true);
      });

      it('should reject non-matching hash or mismatched buffer lengths', () => {
         const secret1 = OpaqueTokenUtil.generateSecret();
         const secret2 = OpaqueTokenUtil.generateSecret();
         const hash1 = OpaqueTokenUtil.hashSecret(secret1, secretKey);
         const hash2 = OpaqueTokenUtil.hashSecret(secret2, secretKey);

         expect(OpaqueTokenUtil.verifyHash(hash1, hash2)).toBe(false);
         expect(OpaqueTokenUtil.verifyHash(hash1, 'different-length')).toBe(false);
         expect(OpaqueTokenUtil.verifyHash('', '')).toBe(false);
      });
   });
});
