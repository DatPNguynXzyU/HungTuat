import { Result } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';

/**
 * Value Object encapsulating domain invariants and normalization for Usernames.
 */
export class Username {
   private constructor(private readonly value: string) {}

   /**
    * Factory method to create and validate a Username value object.
    * Normalizes input by trimming whitespace and converting to lowercase.
    */
   static create(raw: string): Result<Username> {
      const normalized = raw?.trim().toLowerCase() ?? '';

      if (!normalized) {
         return Result.fail(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            reason: USER_ERROR_REASONS.EMPTY,
         });
      }

      if (normalized.length < 3) {
         return Result.fail(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            reason: USER_ERROR_REASONS.MIN_LENGTH,
            min: 3,
            actual: normalized.length,
         });
      }

      if (normalized.length > 30) {
         return Result.fail(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            reason: USER_ERROR_REASONS.MAX_LENGTH,
            max: 30,
            actual: normalized.length,
         });
      }

      if (!this.isValidFormat(normalized)) {
         return Result.fail(USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
            reason: USER_ERROR_REASONS.INVALID_CHARACTERS,
         });
      }

      return Result.ok(new Username(normalized));
   }

   /**
    * Returns the normalized username string.
    */
   getValue(): string {
      return this.value;
   }

   /**
    * Equality check between username value objects.
    */
   equals(other: Username | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }

   private static isValidFormat(username: string): boolean {
      // Must start and end with an alphanumeric character or underscore,
      // can contain dots in the middle, but no consecutive dots
      const usernameRegex = /^[a-zA-Z0-9_][a-zA-Z0-9._]*[a-zA-Z0-9_]$/;
      if (!usernameRegex.test(username)) {
         return false;
      }
      return !username.includes('..');
   }
}
