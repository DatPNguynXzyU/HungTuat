import { Result } from '@common';

/**
 * Value Object encapsulating format and length invariants for verification tokens.
 */
export class VerificationToken {
   private static readonly PREFIX = 'vtok_';
   private static readonly EXPECTED_LENGTH = 41; // vtok_ (5) + 36 chars (hyphenated UUIDv7)
   private static readonly COMPACT_LENGTH = 37; // vtok_ (5) + 32 chars (compact hex UUIDv7)

   private constructor(private readonly value: string) {}

   /**
    * Factory method to validate and create a VerificationToken value object.
    * Enforces prefix 'vtok_' and valid token length invariants (37 or 41 characters).
    */
   static create(token: string): Result<VerificationToken> {
      if (!token) {
         return Result.fail('Verification token cannot be empty');
      }

      if (!token.startsWith(this.PREFIX)) {
         return Result.fail('Invalid verification token format - missing prefix');
      }

      if (token.length !== this.EXPECTED_LENGTH && token.length !== this.COMPACT_LENGTH) {
         return Result.fail('Invalid verification token format - incorrect length', {
            expected: this.EXPECTED_LENGTH,
            actual: token.length,
         });
      }

      return Result.ok(new VerificationToken(token));
   }

   /**
    * Returns the raw verification token string.
    */
   getValue(): string {
      return this.value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: VerificationToken | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value === other.value;
   }
}
