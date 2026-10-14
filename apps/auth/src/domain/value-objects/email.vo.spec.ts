import { Email } from './email.vo';

describe('Email Value Object', () => {
   describe('create', () => {
      it('should successfully create and normalize an email', () => {
         const result = Email.create('  User.Test@Example.COM  ');

         expect(result.isSuccess()).toBe(true);
         const email = result.getValue();
         expect(email.getValue()).toBe('user.test@example.com');
      });

      it('should fail when email is empty or only whitespace', () => {
         const emptyResult = Email.create('');
         expect(emptyResult.isFailure()).toBe(true);
         expect(emptyResult.getError()).toBe('Email cannot be empty');

         const whitespaceResult = Email.create('   ');
         expect(whitespaceResult.isFailure()).toBe(true);
         expect(whitespaceResult.getError()).toBe('Email cannot be empty');
      });

      it('should fail when email format is invalid', () => {
         const invalidEmails = ['invalid-email', 'missing@domain', '@missinguser.com', 'user@.com', 'user @domain.com'];

         for (const invalid of invalidEmails) {
            const result = Email.create(invalid);
            expect(result.isFailure()).toBe(true);
            expect(result.getError()).toBe('Invalid email format');
         }
      });

      it('should fail when email exceeds 254 characters', () => {
         const longDomain = 'a'.repeat(250) + '@example.com';
         const result = Email.create(longDomain);

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Email too long');
      });
   });

   describe('equals', () => {
      it('should return true for identical emails regardless of original casing/whitespace', () => {
         const email1 = Email.create('john.doe@example.com').getValue();
         const email2 = Email.create(' JOHN.DOE@EXAMPLE.COM ').getValue();

         expect(email1.equals(email2)).toBe(true);
      });

      it('should return false for different emails', () => {
         const email1 = Email.create('john.doe@example.com').getValue();
         const email2 = Email.create('jane.doe@example.com').getValue();

         expect(email1.equals(email2)).toBe(false);
      });

      it('should return false when comparing with null or undefined', () => {
         const email = Email.create('john.doe@example.com').getValue();

         expect(email.equals(null)).toBe(false);
         expect(email.equals(undefined as unknown as Email)).toBe(false);
      });
   });
});
