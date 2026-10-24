import { BadRequestException } from '@common';
import { SUPPLIER_ERROR_CODES, SUPPLIER_ERROR_REASONS } from '@contracts/supplier';
import { Slug } from '@supplier/domain/value-objects/slug.vo';

describe('Slug Value Object', () => {
   describe('create() factory method', () => {
      it('should normalize Vietnamese string with accents to slug', () => {
         const res = Slug.create('  Công Ty Cổ Phần Nông Sản Đại Việt  ');
         expect(res.isSuccess()).toBe(true);
         expect(res.getValue().value).toBe('cong-ty-co-phan-nong-san-dai-viet');
         expect(res.getValue().getValue()).toBe('cong-ty-co-phan-nong-san-dai-viet');
      });

      it('should fail when raw input is empty', () => {
         const res = Slug.create('   ');
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(SUPPLIER_ERROR_CODES.INVALID_SLUG);
         expect(res.getParams()).toEqual({
            reason: SUPPLIER_ERROR_REASONS.EMPTY,
         });
      });

      it('should fail when input contains only special characters stripped away', () => {
         const res = Slug.create('???@@@!!!');
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(SUPPLIER_ERROR_CODES.INVALID_SLUG);
         expect(res.getParams()).toEqual({
            reason: SUPPLIER_ERROR_REASONS.INVALID_FORMAT,
         });
      });
   });

   describe('constructor fallback', () => {
      it('should instantiate via constructor for valid string', () => {
         const vo = new Slug('Nha Cung Cap A');
         expect(vo.value).toBe('nha-cung-cap-a');
      });

      it('should throw BadRequestException for invalid input in constructor', () => {
         expect(() => new Slug('')).toThrow(BadRequestException);
      });
   });

   describe('equality and string representation', () => {
      it('should compare equality correctly', () => {
         const s1 = Slug.create('Supplier A').getValue();
         const s2 = Slug.create('supplier-a').getValue();
         const s3 = Slug.create('Supplier B').getValue();

         expect(s1.equals(s2)).toBe(true);
         expect(s1.equals(s3)).toBe(false);
         expect(s1.equals(null)).toBe(false);
         expect(s1.toString()).toBe('supplier-a');
      });
   });
});
