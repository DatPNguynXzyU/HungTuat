import { BadRequestException, COMMON_ERROR_CODES } from '@common';

export class Slug {
   readonly value: string;

   constructor(raw: string) {
      if (!raw || !raw.trim()) {
         throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
            params: { field: 'slug', reason: 'Value cannot be empty' },
         });
      }

      this.value = raw
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[đĐ]/g, 'd')
         .replace(/[^a-z0-9\s-]/g, '')
         .trim()
         .replace(/\s+/g, '-')
         .replace(/-+/g, '-');
   }

   equals(other: Slug): boolean {
      return this.value === other.value;
   }
}
