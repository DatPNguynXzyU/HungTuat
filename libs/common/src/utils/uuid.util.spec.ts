import { v4 } from 'uuid';
import { isValidUuidV7, UUID_V7_REGEX, uuidv7 } from './uuid.util';

describe('UUID Utility', () => {
   describe('uuidv7', () => {
      it('should generate a valid RFC 9562 UUIDv7 string', () => {
         const id = uuidv7();

         expect(typeof id).toBe('string');
         expect(id).toMatch(UUID_V7_REGEX);
         expect(isValidUuidV7(id)).toBe(true);
      });

      it('should generate unique values across consecutive calls', () => {
         const id1 = uuidv7();
         const id2 = uuidv7();
         const id3 = uuidv7();

         expect(id1).not.toBe(id2);
         expect(id2).not.toBe(id3);
      });
   });

   describe('isValidUuidV7', () => {
      it('should return true for valid UUIDv7 strings', () => {
         const id = uuidv7();
         expect(isValidUuidV7(id)).toBe(true);
      });

      it('should return false for UUIDv4 strings', () => {
         const v4Id = v4();
         expect(isValidUuidV7(v4Id)).toBe(false);
      });

      it('should return false for invalid formats or empty values', () => {
         expect(isValidUuidV7('')).toBe(false);
         expect(isValidUuidV7('invalid-uuid')).toBe(false);
         expect(isValidUuidV7('12345678-1234-1234-1234-123456789012')).toBe(false);
         expect(isValidUuidV7(null as unknown as string)).toBe(false);
         expect(isValidUuidV7(undefined as unknown as string)).toBe(false);
      });
   });
});
