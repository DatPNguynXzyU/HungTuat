import type { IPasswordHasher } from '@auth/services/infrastructure';
import { Password } from '@auth/domain/value-objects/password.vo';

describe('Password Value Object', () => {
   describe('create', () => {
      it('should successfully create a valid strong password', () => {
         const result = Password.create('StrongPass123!');

         expect(result.isSuccess()).toBe(true);
         const password = result.getValue();
         expect(password).toBeInstanceOf(Password);
      });

      it('should fail when password is less than 8 characters', () => {
         const result = Password.create('Sh0rt!');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password must be at least 8 characters');
         expect(result.getParams()).toEqual({ min: 8, actual: 6 });
      });

      it('should fail when password is empty or null', () => {
         const emptyResult = Password.create('');
         expect(emptyResult.isFailure()).toBe(true);
         expect(emptyResult.getError()).toBe('Password must be at least 8 characters');
         expect(emptyResult.getParams()).toEqual({ min: 8, actual: 0 });

         const nullResult = Password.create(null as unknown as string);
         expect(nullResult.isFailure()).toBe(true);
         expect(nullResult.getError()).toBe('Password must be at least 8 characters');
      });

      it('should fail when password exceeds 128 characters', () => {
         const longPass = 'A1!' + 'a'.repeat(130);
         const result = Password.create(longPass);

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password too long');
         expect(result.getParams()).toEqual({ max: 128 });
      });

      it('should fail when password lacks an uppercase letter', () => {
         const result = Password.create('lowercase123!');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password must contain at least one uppercase letter');
      });

      it('should fail when password lacks a lowercase letter', () => {
         const result = Password.create('UPPERCASE123!');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password must contain at least one lowercase letter');
      });

      it('should fail when password lacks a number', () => {
         const result = Password.create('NoNumbersHere!');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password must contain at least one number');
      });

      it('should fail when password lacks a special character', () => {
         const result = Password.create('NoSpecialChar123');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password must contain at least one special character');
      });
   });

   describe('hash and verify', () => {
      it('should hash using IPasswordHasher and verify correctly', async () => {
         const mockHasher = {
            hash: jest.fn().mockResolvedValue('$argon2id$mockhash'),
            verify: jest.fn().mockResolvedValue(true),
         };

         const password = Password.create('SecurePassword123#').getValue();
         const hash = await password.hash(mockHasher);

         expect(hash).toBe('$argon2id$mockhash');
         expect(mockHasher.hash).toHaveBeenCalledWith('SecurePassword123#');

         const isValid = await password.verify(hash, mockHasher);
         expect(isValid).toBe(true);
         expect(mockHasher.verify).toHaveBeenCalledWith('$argon2id$mockhash', 'SecurePassword123#');
      });

      it('should throw an error if hasher is missing when hashing or verifying', async () => {
         const password = Password.create('SecurePassword123#').getValue();

         await expect(password.hash(null as unknown as IPasswordHasher)).rejects.toThrow(
            'Password hasher is required for hashing password',
         );
         await expect(password.verify('$argon2id$mockhash', null as unknown as IPasswordHasher)).rejects.toThrow(
            'Password hasher is required for verifying password',
         );
      });
   });

   describe('equals', () => {
      it('should return true for identical passwords', () => {
         const p1 = Password.create('Secret123$').getValue();
         const p2 = Password.create('Secret123$').getValue();

         expect(p1.equals(p2)).toBe(true);
      });

      it('should return false for different passwords', () => {
         const p1 = Password.create('Secret123$').getValue();
         const p2 = Password.create('Different123$').getValue();

         expect(p1.equals(p2)).toBe(false);
      });

      it('should return false when comparing with null or undefined', () => {
         const p = Password.create('Secret123$').getValue();

         expect(p.equals(null)).toBe(false);
         expect(p.equals(undefined as unknown as Password)).toBe(false);
      });
   });
});
