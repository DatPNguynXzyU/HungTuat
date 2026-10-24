import { isValidUuidV7, UUID_V7_REGEX } from '@common';
import { generateUniqueFileName } from '@media/utils/file-name.util';

describe('generateUniqueFileName', () => {
   it('should generate a unique filename preserving extension with valid UUIDv7', () => {
      const fileName = generateUniqueFileName('avatar.jpg');
      const parts = fileName.split('_');
      expect(parts.length).toBe(2);

      const [timestamp, uuidWithExt] = parts;
      expect(Number(timestamp)).toBeGreaterThan(0);

      const [uuid, ext] = uuidWithExt.split('.');
      expect(ext).toBe('jpg');
      expect(UUID_V7_REGEX.test(uuid)).toBe(true);
      expect(isValidUuidV7(uuid)).toBe(true);
   });

   it('should handle filename without extension and contain valid UUIDv7', () => {
      const fileName = generateUniqueFileName('README');
      const parts = fileName.split('_');
      expect(parts.length).toBe(2);

      const [timestamp, uuid] = parts;
      expect(Number(timestamp)).toBeGreaterThan(0);
      expect(UUID_V7_REGEX.test(uuid)).toBe(true);
      expect(isValidUuidV7(uuid)).toBe(true);
   });

   it('should handle undefined or empty filename', () => {
      const fileName = generateUniqueFileName(undefined);
      const parts = fileName.split('_');
      expect(parts.length).toBe(2);

      const [timestamp, uuid] = parts;
      expect(Number(timestamp)).toBeGreaterThan(0);
      expect(UUID_V7_REGEX.test(uuid)).toBe(true);
      expect(isValidUuidV7(uuid)).toBe(true);
   });

   it('should produce distinct names on consecutive invocations', () => {
      const name1 = generateUniqueFileName('file.png');
      const name2 = generateUniqueFileName('file.png');
      expect(name1).not.toBe(name2);
   });
});
