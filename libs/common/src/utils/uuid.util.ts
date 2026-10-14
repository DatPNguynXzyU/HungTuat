import { v7, validate, version } from 'uuid';

export const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks whether a given string is a valid UUIDv7 format.
 */
export function isValidUuidV7(value: string): boolean {
   return typeof value === 'string' && validate(value) && version(value) === 7;
}

/**
 * Generates an RFC 9562 compliant UUIDv7 string using the official standard 'uuid' library.
 */
export function uuidv7(): string {
   return v7();
}
