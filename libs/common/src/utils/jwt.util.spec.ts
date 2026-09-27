import { JwtUtil } from '@common/utils/jwt.util';

describe('JwtUtil', () => {
   const secret = 'test-super-secret-key-for-jwt-testing';
   const testPayload = {
      sub: 'user-uuid-123',
      email: 'user@example.com',
      fullName: 'John Doe',
   };

   describe('sign and verify', () => {
      it('should sign a payload and verify it correctly', () => {
         const token = JwtUtil.sign(testPayload, secret, 3600);
         expect(typeof token).toBe('string');
         expect(token.split('.').length).toBe(3);

         const decoded = JwtUtil.verify(token, secret);
         expect(decoded.sub).toBe(testPayload.sub);
         expect(decoded.email).toBe(testPayload.email);
         expect(decoded.fullName).toBe(testPayload.fullName);
         expect(decoded.iat).toBeDefined();
         expect(decoded.exp).toBeDefined();
         expect(decoded.exp! - decoded.iat!).toBe(3600);
      });

      it('should throw error when verifying with wrong secret', () => {
         const token = JwtUtil.sign(testPayload, secret, 3600);
         expect(() => JwtUtil.verify(token, 'wrong-secret')).toThrow();
      });

      it('should throw error when token is expired', () => {
         const token = JwtUtil.sign(testPayload, secret, -10);
         expect(() => JwtUtil.verify(token, secret)).toThrow();
      });

      it('should throw error when token is malformed', () => {
         expect(() => JwtUtil.verify('invalid.token.structure', secret)).toThrow();
      });
   });

   describe('decode', () => {
      it('should decode a token without secret verification', () => {
         const token = JwtUtil.sign(testPayload, secret, 3600);
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
});
