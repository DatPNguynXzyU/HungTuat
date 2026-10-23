import * as crypto from 'crypto';
import {
   REFRESH_TOKEN_HASH_ALGORITHM,
   REFRESH_TOKEN_HEX_LENGTH,
   REFRESH_TOKEN_SECRET_BYTES,
   TOKEN_HASH_ENCODING,
} from '@auth/constants';

export interface ParsedOpaqueToken {
   jti: string;
   secret: string;
}

/**
 * Utility helper for Opaque Refresh Token formatting, parsing, generation, and constant-time HMAC verification.
 */
export class OpaqueTokenUtil {
   /**
    * Formats an opaque refresh token from a JTI and secret.
    * Output format: `<jti>.<secret>`
    */
   static format(jti: string, secret: string): string {
      return `${jti}.${secret}`;
   }

   /**
    * Parses and validates an opaque token string into its JTI and secret components.
    * Returns null if the token is malformed, has incorrect parts, or invalid secret length.
    */
   static parse(token: string): ParsedOpaqueToken | null {
      if (!token || typeof token !== 'string') {
         return null;
      }

      const parts = token.split('.');
      if (parts.length !== 2) {
         return null;
      }

      const [jti, secret] = parts;
      if (!jti || !secret || secret.length !== REFRESH_TOKEN_HEX_LENGTH || !/^[0-9a-fA-F]+$/.test(secret)) {
         return null;
      }

      return { jti, secret };
   }

   /**
    * Generates a cryptographically secure random secret string in hex format (256-bit entropy).
    */
   static generateSecret(): string {
      return crypto.randomBytes(REFRESH_TOKEN_SECRET_BYTES).toString(TOKEN_HASH_ENCODING);
   }

   /**
    * Computes HMAC-SHA256 hash of the secret token with the configured secret key.
    */
   static hashSecret(secret: string, secretKey: string): string {
      return crypto.createHmac(REFRESH_TOKEN_HASH_ALGORITHM, secretKey).update(secret).digest(TOKEN_HASH_ENCODING);
   }

   /**
    * Performs constant-time comparison between computed hash and stored hash to prevent timing attacks.
    */
   static verifyHash(computedHash: string, storedHash: string): boolean {
      const bufferA = Buffer.from(computedHash, TOKEN_HASH_ENCODING);
      const bufferB = Buffer.from(storedHash, TOKEN_HASH_ENCODING);
      if (bufferA.length !== bufferB.length || bufferA.length === 0) {
         return false;
      }
      return crypto.timingSafeEqual(bufferA, bufferB);
   }
}
