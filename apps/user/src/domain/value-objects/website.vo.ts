import { Result } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';

/**
 * Value Object encapsulating domain invariants for User Website / URL.
 */
export class Website {
   private constructor(private readonly value: string | null) {}

   /**
    * Factory method to create and validate a Website value object.
    * Allows null/undefined/empty string. If provided, must be a valid HTTP or HTTPS URL.
    */
   static create(raw?: string | null): Result<Website> {
      if (raw === undefined || raw === null) {
         return Result.ok(new Website(null));
      }

      const trimmed = raw.trim();
      if (trimmed.length === 0) {
         return Result.ok(new Website(null));
      }

      if (trimmed.length > 2048) {
         return Result.fail(USER_ERROR_CODES.INVALID_WEBSITE, {
            reason: USER_ERROR_REASONS.MAX_LENGTH,
            max: 2048,
            actual: trimmed.length,
         });
      }

      if (!this.isValidUrl(trimmed)) {
         return Result.fail(USER_ERROR_CODES.INVALID_WEBSITE, {
            reason: USER_ERROR_REASONS.INVALID_PROTOCOL_OR_FORMAT,
         });
      }

      return Result.ok(new Website(trimmed));
   }

   /**
    * Returns the website URL string or null if empty.
    */
   getValue(): string | null {
      return this.value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: Website | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }

   private static isValidUrl(url: string): boolean {
      try {
         const parsed = new URL(url);
         return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
         return false;
      }
   }
}
