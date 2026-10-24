import { uuidv7 } from '@common';

/**
 * Generates a unique, collision-resistant file name preserving the original file extension.
 * Format: `<timestamp>_<short_uuid>.<extension>`
 *
 * @param originalFileName The original file name (e.g. "avatar.png")
 * @returns A unique file name string
 */
export function generateUniqueFileName(originalFileName?: string): string {
   const ext = originalFileName && originalFileName.includes('.') ? originalFileName.split('.').pop() : '';
   const id = uuidv7();
   return `${Date.now()}_${id}${ext ? `.${ext}` : ''}`;
}
