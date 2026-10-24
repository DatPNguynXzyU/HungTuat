import { BadRequestException, Result } from '@common';
import { SUPPLIER_ERROR_CODES, SUPPLIER_ERROR_REASONS } from '@contracts/supplier';
import { generateFallbackSupplierCode, generateSupplierCode } from '@supplier/utils';

/**
 * Value Object encapsulating domain invariants and normalization for Supplier Code.
 */
export class SupplierCode {
   private readonly _value: string;

   constructor(raw: string, isInternal = false) {
      if (isInternal) {
         this._value = raw;
         return;
      }

      const result = SupplierCode.create(raw);
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
    * Factory method to create and validate a SupplierCode value object.
    * Normalizes input by trimming whitespace and converting to uppercase.
    */
   static create(raw: string): Result<SupplierCode> {
      const trimmed = raw?.trim() ?? '';
      if (!trimmed) {
         return Result.fail(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE, {
            reason: SUPPLIER_ERROR_REASONS.EMPTY,
         });
      }

      const cleaned = trimmed.toUpperCase();
      if (cleaned.length < 3) {
         return Result.fail(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE, {
            reason: SUPPLIER_ERROR_REASONS.MIN_LENGTH,
            min: 3,
            actual: cleaned.length,
         });
      }

      if (cleaned.length > 50) {
         return Result.fail(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE, {
            reason: SUPPLIER_ERROR_REASONS.MAX_LENGTH,
            max: 50,
            actual: cleaned.length,
         });
      }

      return Result.ok(new SupplierCode(cleaned, true));
   }

   /**
    * Returns the normalized supplier code string value.
    */
   getValue(): string {
      return this._value;
   }

   /**
    * Value equality comparison.
    */
   equals(other: SupplierCode | null | undefined): boolean {
      if (!other) {
         return false;
      }
      return this._value === other.value;
   }

   toString(): string {
      return this._value;
   }

   static generate(prefix?: string): SupplierCode {
      return new SupplierCode(generateSupplierCode(prefix), true);
   }

   static generateFallback(prefix?: string): SupplierCode {
      return new SupplierCode(generateFallbackSupplierCode(prefix), true);
   }
}
