import { Result } from '@common';

/**
 * Value Object encapsulating domain invariants and normalization for an Email address.
 */
export class Email {
   private constructor(private readonly value: string) {}

   /**
    * Factory method to create and validate an Email value object.
    * Normalizes input by trimming whitespace and converting to lowercase.
    */
   static create(email: string): Result<Email> {
      const normalized = email?.trim().toLowerCase() ?? '';

      if (!normalized) {
         return Result.fail('Email cannot be empty');
      }

      if (!this.isValidFormat(normalized)) {
         return Result.fail('Invalid email format');
      }

      if (normalized.length > 254) {
         return Result.fail('Email too long');
      }

      return Result.ok(new Email(normalized));
   }

   /**
    * Returns the normalized email string value.
    */
   getValue(): string {
      return this.value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: Email | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }

   private static isValidFormat(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
   }
}
