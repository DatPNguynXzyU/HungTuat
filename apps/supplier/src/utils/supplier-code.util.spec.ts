import {
   DEFAULT_SUPPLIER_CODE_PREFIX,
   generateFallbackSupplierCode,
   generateSupplierCode,
} from '@supplier/utils/supplier-code.util';

describe('SupplierCode Utils', () => {
   describe('generateSupplierCode', () => {
      it('should generate a code with default prefix SUP-', () => {
         const code = generateSupplierCode();
         expect(code).toMatch(new RegExp(`^${DEFAULT_SUPPLIER_CODE_PREFIX}-[A-Z0-9]+$`));
         expect(code.length).toBeGreaterThanOrEqual(5);
      });

      it('should respect custom prefix when provided', () => {
         const code = generateSupplierCode('VND');
         expect(code).toMatch(/^VND-[A-Z0-9]+$/);
      });
   });

   describe('generateFallbackSupplierCode', () => {
      it('should generate a timestamp-based fallback code with default prefix', () => {
         const code = generateFallbackSupplierCode();
         expect(code).toMatch(new RegExp(`^${DEFAULT_SUPPLIER_CODE_PREFIX}-[A-Z0-9]+$`));
      });

      it('should respect custom prefix for fallback', () => {
         const code = generateFallbackSupplierCode('MERCH');
         expect(code).toMatch(/^MERCH-[A-Z0-9]+$/);
      });
   });
});
