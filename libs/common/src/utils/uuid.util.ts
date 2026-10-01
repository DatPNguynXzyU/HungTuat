import { randomBytes } from 'crypto';

/**
 * Generates an RFC 9562 compliant UUIDv7 string.
 */
export function uuidv7(): string {
   const now = Date.now();
   const bytes = randomBytes(16);

   // Timestamp: 48 bits (6 bytes)
   bytes[0] = Math.floor(now / 0x10000000000) & 0xff;
   bytes[1] = Math.floor(now / 0x100000000) & 0xff;
   bytes[2] = Math.floor(now / 0x1000000) & 0xff;
   bytes[3] = Math.floor(now / 0x10000) & 0xff;
   bytes[4] = Math.floor(now / 0x100) & 0xff;
   bytes[5] = now & 0xff;

   // Version 7: 4 bits (0111)
   bytes[6] = (bytes[6] & 0x0f) | 0x70;

   // Variant: 2 bits (10xx)
   bytes[8] = (bytes[8] & 0x3f) | 0x80;

   const hex = bytes.toString('hex');
   return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
