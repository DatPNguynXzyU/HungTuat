import { Result } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';

/**
 * Value Object encapsulating domain invariants for User Biography.
 */
export class Bio {
   private constructor(private readonly value: string | null) {}

   /**
    * Factory method to create and validate a Bio value object.
    * Allows null/undefined/empty string, enforcing max length of 500 characters.
    */
   static create(raw?: string | null): Result<Bio> {
      if (raw === undefined || raw === null) {
         return Result.ok(new Bio(null));
      }

      const trimmed = raw.trim();
      if (trimmed.length === 0) {
         return Result.ok(new Bio(null));
      }

      if (trimmed.length > 500) {
         return Result.fail(USER_ERROR_CODES.INVALID_BIO, {
            reason: USER_ERROR_REASONS.MAX_LENGTH,
            max: 500,
            actual: trimmed.length,
         });
      }

      return Result.ok(new Bio(trimmed));
   }

   /**
    * Returns the bio string or null if empty.
    */
   getValue(): string | null {
      return this.value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: Bio | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }
}
