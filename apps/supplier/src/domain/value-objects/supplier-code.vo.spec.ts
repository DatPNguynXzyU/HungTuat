import { BadRequestException } from '@common';
import { SUPPLIER_ERROR_CODES, SUPPLIER_ERROR_REASONS } from '@contracts/supplier';
import { SupplierCode } from '@supplier/domain/value-objects/supplier-code.vo';

describe('SupplierCode Value Object', () => {
   describe('create() factory method', () => {
      it('should successfully create valid supplier code', () => {
         const res = SupplierCode.create('  sup-abc123  ');
         expect(res.isSuccess()).toBe(true);
         expect(res.getValue().value).toBe('SUP-ABC123');
         expect(res.getValue().getValue()).toBe('SUP-ABC123');
      });

      it('should fail when code is empty', () => {
         const res = SupplierCode.create('   ');
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE);
         expect(res.getParams()).toEqual({
            reason: SUPPLIER_ERROR_REASONS.EMPTY,
         });
      });

      it('should fail when code is shorter than 3 characters', () => {
         const res = SupplierCode.create('AB');
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE);
         expect(res.getParams()).toEqual({
            reason: SUPPLIER_ERROR_REASONS.MIN_LENGTH,
            min: 3,
            actual: 2,
         });
      });

      it('should fail when code exceeds 50 characters', () => {
         const longCode = 'A'.repeat(51);
         const res = SupplierCode.create(longCode);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(SUPPLIER_ERROR_CODES.INVALID_SUPPLIER_CODE);
         expect(res.getParams()).toEqual({
            reason: SUPPLIER_ERROR_REASONS.MAX_LENGTH,
            max: 50,
            actual: 51,
         });
      });
   });

   describe('constructor fallback', () => {
      it('should instantiate via constructor for valid string', () => {
         const vo = new SupplierCode('SUP-12345');
         expect(vo.value).toBe('SUP-12345');
      });

      it('should throw BadRequestException for invalid code in constructor', () => {
         expect(() => new SupplierCode('')).toThrow(BadRequestException);
      });
   });

   describe('equality and string representation', () => {
      it('should compare equality correctly', () => {
         const c1 = SupplierCode.create('SUP-01').getValue();
         const c2 = SupplierCode.create('SUP-01').getValue();
         const c3 = SupplierCode.create('SUP-02').getValue();

         expect(c1.equals(c2)).toBe(true);
         expect(c1.equals(c3)).toBe(false);
         expect(c1.equals(null)).toBe(false);
         expect(c1.toString()).toBe('SUP-01');
      });
   });

   describe('code generation', () => {
      it('should generate valid supplier code via static generate()', () => {
         const generated = SupplierCode.generate();
         expect(generated.value).toMatch(/^SUP-[A-Z0-9]+$/);
      });

      it('should generate fallback supplier code via static generateFallback()', () => {
         const fallback = SupplierCode.generateFallback('CUSTOM');
         expect(fallback.value).toMatch(/^CUSTOM-[A-Z0-9]+$/);
      });
   });
});
