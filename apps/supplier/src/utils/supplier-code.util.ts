export const DEFAULT_SUPPLIER_CODE_PREFIX = 'SUP';

/**
 * Generates a random uppercase supplier code with prefix (e.g., SUP-A8K2F1).
 */
export function generateSupplierCode(prefix: string = DEFAULT_SUPPLIER_CODE_PREFIX): string {
   const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
   return `${prefix}-${randomPart}`;
}

/**
 * Generates a timestamp-based fallback supplier code (e.g., SUP-L9M2X4Y)
 * used when random generation encounters collisions.
 */
export function generateFallbackSupplierCode(prefix: string = DEFAULT_SUPPLIER_CODE_PREFIX): string {
   const timestampPart = Date.now().toString(36).toUpperCase();
   return `${prefix}-${timestampPart}`;
}
