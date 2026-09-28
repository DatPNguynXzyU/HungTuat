import { Argon2Util } from '@common/utils/argon2.util';

describe('Argon2Util', () => {
   it('should correctly hash and verify password without secret/salt', async () => {
      const password = 'mySecurePassword123!';
      const hash = await Argon2Util.hash(password);

      expect(hash).toContain('$argon2id$');
      const isValid = await Argon2Util.verify(hash, password);
      expect(isValid).toBe(true);

      const isInvalid = await Argon2Util.verify(hash, 'wrongPassword');
      expect(isInvalid).toBe(false);
   });

   it('should correctly hash and verify password with string secret/salt', async () => {
      const secret = 'super-secret-salt-key';
      const password = 'myPepperedPassword456!';
      const hash = await Argon2Util.hash(password, secret);

      expect(hash).toContain('$argon2id$');
      const isValid = await Argon2Util.verify(hash, password, secret);
      expect(isValid).toBe(true);

      // Verify fails if secret is changed
      const isMismatch = await Argon2Util.verify(hash, password, 'different-secret');
      expect(isMismatch).toBe(false);
   });

   it('should correctly hash and verify password with options object', async () => {
      const password = 'myOptionsPassword789!';
      const hash = await Argon2Util.hash(password, {
         secret: 'custom-secret-in-options',
         memoryCost: 32768,
      });

      expect(hash).toContain('$argon2id$');
      const isValid = await Argon2Util.verify(hash, password, {
         secret: 'custom-secret-in-options',
      });
      expect(isValid).toBe(true);
   });

   it('should return false when verifying invalid or malformed hash', async () => {
      const isValid = await Argon2Util.verify('invalid-hash-string', 'password');
      expect(isValid).toBe(false);
   });
});
