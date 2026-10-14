import { Result } from '@common';
import type { IPasswordHasher } from '@auth/services/infrastructure';

/**
 * Value Object encapsulating domain invariants and security rules for user Passwords.
 * Raw password value is strictly encapsulated and never exposed publicly.
 */
export class Password {
   private constructor(private readonly value: string) {}

   /**
    * Factory method to validate and create a Password value object.
    * Enforces domain complexity invariants: min 8, max 128 chars, uppercase, lowercase, number, special char.
    */
   static create(password: string): Result<Password> {
      if (!password || password.length < 8) {
         return Result.fail('Password must be at least 8 characters', {
            min: 8,
            actual: password?.length || 0,
         });
      }

      if (password.length > 128) {
         return Result.fail('Password too long', { max: 128 });
      }

      if (!/[A-Z]/.test(password)) {
         return Result.fail('Password must contain at least one uppercase letter');
      }

      if (!/[a-z]/.test(password)) {
         return Result.fail('Password must contain at least one lowercase letter');
      }

      if (!/[0-9]/.test(password)) {
         return Result.fail('Password must contain at least one number');
      }

      if (!/[^A-Za-z0-9]/.test(password)) {
         return Result.fail('Password must contain at least one special character');
      }

      return Result.ok(new Password(password));
   }

   /**
    * Computes cryptographic hash for the password using the provided password hasher.
    */
   async hash(hasher: IPasswordHasher): Promise<string> {
      if (!hasher) {
         throw new Error('Password hasher is required for hashing password');
      }
      return hasher.hash(this.value);
   }

   /**
    * Verifies the password against a cryptographic hash using the provided password hasher.
    */
   async verify(hashedPassword: string, hasher: IPasswordHasher): Promise<boolean> {
      if (!hasher) {
         throw new Error('Password hasher is required for verifying password');
      }
      return hasher.verify(hashedPassword, this.value);
   }

   /**
    * Value equality comparison without exposing raw string value.
    */
   equals(other: Password | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }

   /**
    * Encapsulated raw string value accessible only internally.
    */
   private getValue(): string {
      return this.value;
   }
}
