import { Result } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';

/**
 * Value Object encapsulating domain invariants and business logic for Date of Birth.
 */
export class DateOfBirth {
   private constructor(private readonly value: Date) {}

   /**
    * Factory method to create and validate a DateOfBirth value object.
    * Invariants:
    * - Must be a valid date
    * - Cannot be in the future
    * - Cannot be more than 125 years ago
    */
   static create(raw: Date | string | number | null | undefined): Result<DateOfBirth> {
      if (raw === null || raw === undefined || raw === '') {
         return Result.fail(USER_ERROR_CODES.INVALID_DATE_OF_BIRTH, {
            reason: USER_ERROR_REASONS.EMPTY,
         });
      }

      const parsedDate = raw instanceof Date ? raw : new Date(raw);

      if (isNaN(parsedDate.getTime())) {
         return Result.fail(USER_ERROR_CODES.INVALID_DATE_OF_BIRTH, {
            reason: USER_ERROR_REASONS.INVALID_FORMAT,
         });
      }

      const now = new Date();
      if (parsedDate.getTime() > now.getTime()) {
         return Result.fail(USER_ERROR_CODES.INVALID_DATE_OF_BIRTH, {
            reason: USER_ERROR_REASONS.FUTURE_DATE,
         });
      }

      const calculatedAge = DateOfBirth.computeAge(parsedDate, now);
      if (calculatedAge > 125) {
         return Result.fail(USER_ERROR_CODES.INVALID_DATE_OF_BIRTH, {
            reason: USER_ERROR_REASONS.MAX_AGE_EXCEEDED,
            maxAge: 125,
            calculatedAge,
         });
      }

      return Result.ok(new DateOfBirth(parsedDate));
   }

   /**
    * Returns the underlying Date object.
    */
   getValue(): Date {
      return new Date(this.value.getTime());
   }

   /**
    * Computes user age based on current date.
    */
   getAge(currentDate: Date = new Date()): number {
      return DateOfBirth.computeAge(this.value, currentDate);
   }

   /**
    * Checks if the user is an adult based on minimum age threshold (default: 18).
    */
   isAdult(minAge = 18): boolean {
      return this.getAge() >= minAge;
   }

   /**
    * Formats as ISO date string (YYYY-MM-DD).
    */
   toISOString(): string {
      return this.value.toISOString();
   }

   /**
    * Value equality comparison.
    */
   equals(other: DateOfBirth | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this.value.getTime() === other.value.getTime();
   }

   private static computeAge(birthDate: Date, referenceDate: Date): number {
      let age = referenceDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
         age--;
      }
      return age >= 0 ? age : 0;
   }
}
