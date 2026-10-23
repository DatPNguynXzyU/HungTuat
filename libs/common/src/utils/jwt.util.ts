import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import {
   AUTH_ERROR_REASONS,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_ALGORITHM,
   DEFAULT_JWT_KEY_ID,
   type JwtTokenType,
} from '@common/constants/jwt.constant';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import type { IJwksResponse, IJsonWebKey } from '@common/interfaces/jwt.interface';

export interface JwtPayload {
   sub: string;
   email: string;
   roles?: string[];
   permissions?: string[];
   tokenType?: JwtTokenType;
   jti?: string;
   iat?: number;
   exp?: number;
   [key: string]: unknown;
}

export class JwtUtil {
   static formatPemKey(rawKey?: string): string {
      if (!rawKey) {
         return '';
      }
      let formatted = rawKey.trim();
      if (
         (formatted.startsWith('"') && formatted.endsWith('"')) ||
         (formatted.startsWith("'") && formatted.endsWith("'"))
      ) {
         formatted = formatted.slice(1, -1);
      }
      formatted = formatted.replace(/\\n/g, '\n');

      if (!formatted.includes('-----BEGIN')) {
         try {
            const decoded = Buffer.from(formatted, 'base64').toString('utf-8');
            if (decoded.includes('-----BEGIN')) {
               formatted = decoded;
            }
         } catch {
            // Keep original formatted string if base64 decoding fails
         }
      }
      return formatted.trim();
   }

   static resolveFilePath(filePath: string): string {
      if (path.isAbsolute(filePath)) {
         return filePath;
      }
      return path.resolve(process.cwd(), filePath);
   }

   static readKeyFile(filePath?: string): string | null {
      if (!filePath) {
         return null;
      }
      try {
         const resolved = this.resolveFilePath(filePath);
         if (fs.existsSync(resolved)) {
            const content = fs.readFileSync(resolved, 'utf-8');
            return this.formatPemKey(content);
         }
      } catch {
         // Silently return null if reading fails
      }
      return null;
   }

   static loadKeyFromFile(filePath?: string, fallbackKey: string = DEFAULT_DEV_RSA_PUBLIC_KEY): string {
      const fromFile = this.readKeyFile(filePath);
      if (fromFile) {
         return fromFile;
      }
      return this.formatPemKey(fallbackKey) || DEFAULT_DEV_RSA_PUBLIC_KEY;
   }

   static derivePublicKey(privateKeyPem: string): string {
      const formattedKey = this.formatPemKey(privateKeyPem);
      const publicKeyObject = crypto.createPublicKey(formattedKey);
      return publicKeyObject.export({ type: 'spki', format: 'pem' }) as string;
   }

   static generateKeyPair(modulusLength: number = 2048): { privateKey: string; publicKey: string } {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
         modulusLength,
         privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
         publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      return {
         privateKey: privateKey,
         publicKey: publicKey,
      };
   }

   static generateJwks(
      publicKeyPem: string = DEFAULT_DEV_RSA_PUBLIC_KEY,
      keyId: string = DEFAULT_JWT_KEY_ID,
      alg: string = DEFAULT_JWT_ALGORITHM,
      use: string = 'sig',
   ): IJwksResponse {
      const formattedKey = this.formatPemKey(publicKeyPem) || DEFAULT_DEV_RSA_PUBLIC_KEY;
      const publicKeyObject = crypto.createPublicKey(formattedKey);
      const jwk = publicKeyObject.export({ format: 'jwk' }) as unknown as IJsonWebKey;

      const key: IJsonWebKey = {
         ...jwk,
         kid: keyId,
         use,
         alg,
      };

      return {
         keys: [key],
      };
   }

   static sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      privateKey: string = DEFAULT_DEV_RSA_PRIVATE_KEY,
      expiresInSeconds: number = 86400,
      options?: Omit<SignOptions, 'expiresIn'>,
   ): string {
      const cleanPayload = { ...payload };
      delete cleanPayload.iat;
      delete cleanPayload.exp;

      const formattedKey = typeof privateKey === 'string' ? this.formatPemKey(privateKey) : privateKey;

      const signOptions: SignOptions = {
         algorithm: DEFAULT_JWT_ALGORITHM,
         keyid: options?.keyid || DEFAULT_JWT_KEY_ID,
         expiresIn: expiresInSeconds,
         ...options,
      };

      return jwt.sign(cleanPayload, formattedKey, signOptions);
   }

   static verify(token: string, publicKey: string = DEFAULT_DEV_RSA_PUBLIC_KEY, options?: VerifyOptions): JwtPayload {
      const formattedKey = typeof publicKey === 'string' ? this.formatPemKey(publicKey) : publicKey;

      const verifyOptions: VerifyOptions = {
         algorithms: [DEFAULT_JWT_ALGORITHM],
         ...options,
      };

      const decoded = jwt.verify(token, formattedKey, verifyOptions);
      if (typeof decoded === 'string' || !decoded) {
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED },
         });
      }
      return decoded as JwtPayload;
   }

   static decode(token: string, options?: jwt.DecodeOptions): JwtPayload | null {
      const decoded = jwt.decode(token, options);
      if (!decoded || typeof decoded === 'string') {
         return null;
      }
      return decoded as JwtPayload;
   }
}
