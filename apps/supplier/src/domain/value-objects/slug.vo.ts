import { BadRequestException, Result } from '@common';
import { SUPPLIER_ERROR_CODES, SUPPLIER_ERROR_REASONS } from '@contracts/supplier';

/**
 * Value Object encapsulating domain invariants and normalization for Supplier Slug.
 */
export class Slug {
   private readonly _value: string;

   constructor(raw: string, isInternal = false) {
      if (isInternal) {
         this._value = raw;
         return;
      }

      const result = Slug.create(raw);
      if (result.isFailure()) {
         throw new BadRequestException(result.getError(), {
            params: result.getParams(),
         });
      }
      this._value = result.getValue().value;
   }

   get value(): string {
      return this._value;
   }

   /**
    * Factory method to create and validate a Slug value object.
    * Normalizes input by removing Vietnamese diacritics, special characters, and converting spaces to hyphens.
    */
   static create(raw: string): Result<Slug> {
      const trimmed = raw?.trim() ?? '';
      if (!trimmed) {
         return Result.fail(SUPPLIER_ERROR_CODES.INVALID_SLUG, {
            reason: SUPPLIER_ERROR_REASONS.EMPTY,
         });
      }

      const slugified = trimmed
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[đĐ]/g, 'd')
         .replace(/[^a-z0-9\s-]/g, '')
         .trim()
         .replace(/\s+/g, '-')
         .replace(/-+/g, '-');

      if (!slugified) {
         return Result.fail(SUPPLIER_ERROR_CODES.INVALID_SLUG, {
            reason: SUPPLIER_ERROR_REASONS.INVALID_FORMAT,
         });
      }

      return Result.ok(new Slug(slugified, true));
   }

   /**
    * Returns the normalized slug string value.
    */
   getValue(): string {
      return this._value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: Slug | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this._value === other.value;
   }

   toString(): string {
      return this._value;
   }
}
