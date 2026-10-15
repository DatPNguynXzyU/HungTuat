import { Result } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';

/**
 * Value Object encapsulating domain invariants for User Display Names.
 */
export class DisplayName {
   private constructor(private readonly value: string) {}

   /**
    * Factory method to create and validate a DisplayName value object.
    * Trims leading/trailing whitespace and validates length (2-50 chars).
    */
   static create(raw: string): Result<DisplayName> {
      const trimmed = raw?.trim() ?? '';

      if (!trimmed) {
         return Result.fail(USER_ERROR_CODES.INVALID_DISPLAY_NAME_FORMAT, {
            reason: USER_ERROR_REASONS.EMPTY,
         });
      }

      if (trimmed.length < 2) {
         return Result.fail(USER_ERROR_CODES.INVALID_DISPLAY_NAME_FORMAT, {
            reason: USER_ERROR_REASONS.MIN_LENGTH,
            min: 2,
            actual: trimmed.length,
         });
      }

      if (trimmed.length > 50) {
         return Result.fail(USER_ERROR_CODES.INVALID_DISPLAY_NAME_FORMAT, {
            reason: USER_ERROR_REASONS.MAX_LENGTH,
            max: 50,
            actual: trimmed.length,
         });
      }

      return Result.ok(new DisplayName(trimmed));
   }

   /**
    * Returns the trimmed display name string.
    */
   getValue(): string {
      return this.value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: DisplayName | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }
}
