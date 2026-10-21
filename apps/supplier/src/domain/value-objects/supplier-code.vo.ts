import { BadRequestException, COMMON_ERROR_CODES } from '@common';

export class SupplierCode {
   readonly value: string;

   constructor(raw: string) {
      if (!raw || !raw.trim()) {
         throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
            params: { field: 'supplierCode', reason: 'Value cannot be empty' },
         });
      }

      const cleaned = raw.trim().toUpperCase();
      if (cleaned.length < 3 || cleaned.length > 50) {
         throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
            params: { field: 'supplierCode', reason: 'Length must be between 3 and 50 characters' },
         });
      }

      this.value = cleaned;
   }

   equals(other: SupplierCode): boolean {
      return this.value === other.value;
   }
}
