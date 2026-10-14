import { VerificationToken } from './verification-token.vo';

describe('VerificationToken Value Object', () => {
   describe('create', () => {
      it('should successfully create a valid 41-char hyphenated verification token', () => {
         // vtok_ (5) + 36-char hyphenated UUID = 41 chars
         const rawToken = 'vtok_018d45e0-7c2a-7f61-b541-10c7936a28e8';
         const result = VerificationToken.create(rawToken);

         expect(result.isSuccess()).toBe(true);
         const vo = result.getValue();
         expect(vo.getValue()).toBe(rawToken);
      });

      it('should successfully create a valid 37-char compact verification token', () => {
         // vtok_ (5) + 32-char hex UUID = 37 chars
         const rawToken = 'vtok_018d45e07c2a7f61b54110c7936a28e8';
         const result = VerificationToken.create(rawToken);

         expect(result.isSuccess()).toBe(true);
         const vo = result.getValue();
         expect(vo.getValue()).toBe(rawToken);
      });

      it('should fail when token is empty or null', () => {
         const emptyResult = VerificationToken.create('');
         expect(emptyResult.isFailure()).toBe(true);
         expect(emptyResult.getError()).toBe('Verification token cannot be empty');

         const nullResult = VerificationToken.create(null as unknown as string);
         expect(nullResult.isFailure()).toBe(true);
         expect(nullResult.getError()).toBe('Verification token cannot be empty');
      });

      it('should fail when token is missing the vtok_ prefix', () => {
         const result = VerificationToken.create('invalid_018d45e07c2a7f61b54110c7936a28e8');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Invalid verification token format - missing prefix');
      });

      it('should fail when token length is neither 37 nor 41 characters', () => {
         const shortToken = 'vtok_short';
         const result = VerificationToken.create(shortToken);

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Invalid verification token format - incorrect length');
         expect(result.getParams()).toEqual({
            expected: 41,
            actual: shortToken.length,
         });
      });
   });

   describe('equals', () => {
      it('should return true for identical tokens', () => {
         const t1 = VerificationToken.create('vtok_018d45e07c2a7f61b54110c7936a28e8').getValue();
         const t2 = VerificationToken.create('vtok_018d45e07c2a7f61b54110c7936a28e8').getValue();

         expect(t1.equals(t2)).toBe(true);
      });

      it('should return false for different tokens', () => {
         const t1 = VerificationToken.create('vtok_018d45e07c2a7f61b54110c7936a28e8').getValue();
         const t2 = VerificationToken.create('vtok_ffffffffffffffffffffffffffffffff').getValue();

         expect(t1.equals(t2)).toBe(false);
      });

      it('should return false when comparing with null or undefined', () => {
         const t = VerificationToken.create('vtok_018d45e07c2a7f61b54110c7936a28e8').getValue();

         expect(t.equals(null)).toBe(false);
         expect(t.equals(undefined as unknown as VerificationToken)).toBe(false);
      });
   });
});
