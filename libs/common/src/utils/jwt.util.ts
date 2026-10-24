import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import jwt, { type Algorithm, type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import {
   AUTH_ERROR_REASONS,
   DEFAULT_DEV_EC_PRIVATE_KEY,
   DEFAULT_DEV_EC_PUBLIC_KEY,
   DEFAULT_JWT_ALGORITHM,
   DEFAULT_JWT_AUDIENCE,
   DEFAULT_JWT_ISSUER,
   DEFAULT_JWT_KEY_ID,
   JWT_ALGORITHM,
   type JwtTokenType,
} from '@common/constants/jwt.constant';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import type { IJsonWebKey, IJwksResponse } from '@common/interfaces/jwt.interface';

export interface JwtPayload {
   sub: string;
   email: string;
   roles?: string[];
   permissions?: string[];
   tokenType?: JwtTokenType;
   jti?: string;
   iss?: string;
   aud?: string | string[];
   iat?: number;
   exp?: number;
   [key: string]: unknown;
}

export interface JwkKeyConfig {
   publicKeyPem: string;
   keyId?: string;
   alg?: string;
   use?: string;
}

export interface JwtCompleteToken<T = JwtPayload> {
   header: {
      alg: string;
      typ?: string;
      kid?: string;
      [key: string]: unknown;
   };
   payload: T;
   signature: string;
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

   static loadKeyFromFile(filePath?: string, fallbackKey: string = DEFAULT_DEV_EC_PUBLIC_KEY): string {
      const fromFile = this.readKeyFile(filePath);
      if (fromFile) {
         return fromFile;
      }
      return this.formatPemKey(fallbackKey) || DEFAULT_DEV_EC_PUBLIC_KEY;
   }

   static derivePublicKey(privateKeyPem: string): string {
      const formattedKey = this.formatPemKey(privateKeyPem);
      const publicKeyObject = crypto.createPublicKey(formattedKey);
      return publicKeyObject.export({ type: 'spki', format: 'pem' }) as string;
   }

   static generateEcKeyPair(namedCurve: string = 'prime256v1'): { privateKey: string; publicKey: string } {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
         namedCurve,
         privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
         publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      return {
         privateKey,
         publicKey,
      };
   }

   static generateRsaKeyPair(modulusLength: number = 2048): { privateKey: string; publicKey: string } {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
         modulusLength,
         privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
         publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      return {
         privateKey,
         publicKey,
      };
   }

   static generateKeyPair(
      type: 'ec' | 'rsa' = 'ec',
      modulusLengthOrCurve: number | string = type === 'ec' ? 'prime256v1' : 2048,
   ): { privateKey: string; publicKey: string } {
      if (type === 'rsa') {
         return this.generateRsaKeyPair(typeof modulusLengthOrCurve === 'number' ? modulusLengthOrCurve : 2048);
      }
      return this.generateEcKeyPair(typeof modulusLengthOrCurve === 'string' ? modulusLengthOrCurve : 'prime256v1');
   }

   static pemToJwk(
      publicKeyPem: string = DEFAULT_DEV_EC_PUBLIC_KEY,
      keyId: string = DEFAULT_JWT_KEY_ID,
      alg?: string,
      use: string = 'sig',
   ): IJsonWebKey {
      const formattedKey = this.formatPemKey(publicKeyPem) || DEFAULT_DEV_EC_PUBLIC_KEY;
      const publicKeyObject = crypto.createPublicKey(formattedKey);
      const jwk = publicKeyObject.export({ format: 'jwk' }) as unknown as IJsonWebKey;

      const detectedAlg =
         alg || (publicKeyObject.asymmetricKeyType === 'ec' ? JWT_ALGORITHM.ES256 : JWT_ALGORITHM.RS256);

      return {
         ...jwk,
         kid: keyId,
         use,
         alg: detectedAlg,
      };
   }

   static jwkToPem(jwk: IJsonWebKey): string {
      const { kid: _kid, alg: _alg, use: _use, ...keyData } = jwk;
      const publicKeyObject = crypto.createPublicKey({
         key: keyData as crypto.JsonWebKey,
         format: 'jwk',
      });
      return publicKeyObject.export({ type: 'spki', format: 'pem' }) as string;
   }

   static resolveKeyFromJwks(jwks: IJwksResponse, kid?: string, alg?: string): string | null {
      if (!jwks?.keys || jwks.keys.length === 0) {
         return null;
      }

      let matchedKey: IJsonWebKey | undefined;

      if (kid) {
         matchedKey = jwks.keys.find((key) => key.kid === kid);
      }

      if (!matchedKey && alg) {
         matchedKey = jwks.keys.find((key) => key.alg === alg);
      }

      if (!matchedKey) {
         matchedKey = jwks.keys[0];
      }

      if (!matchedKey) {
         return null;
      }

      try {
         return this.jwkToPem(matchedKey);
      } catch {
         return null;
      }
   }

   static generateJwks(
      publicKeyPemOrConfigs: string | JwkKeyConfig[] = DEFAULT_DEV_EC_PUBLIC_KEY,
      keyId: string = DEFAULT_JWT_KEY_ID,
      alg?: string,
      use: string = 'sig',
   ): IJwksResponse {
      if (Array.isArray(publicKeyPemOrConfigs)) {
         return {
            keys: publicKeyPemOrConfigs.map((cfg, idx) =>
               this.pemToJwk(cfg.publicKeyPem, cfg.keyId || `${keyId}-${idx + 1}`, cfg.alg, cfg.use || use),
            ),
         };
      }

      return {
         keys: [this.pemToJwk(publicKeyPemOrConfigs, keyId, alg, use)],
      };
   }

   static sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      privateKey: string = DEFAULT_DEV_EC_PRIVATE_KEY,
      expiresInSeconds: number = 86400,
      options?: Omit<SignOptions, 'expiresIn'>,
   ): string {
      const cleanPayload = { ...payload };
      delete cleanPayload.iat;
      delete cleanPayload.exp;

      const formattedKey = typeof privateKey === 'string' ? this.formatPemKey(privateKey) : privateKey;

      let algorithm = options?.algorithm;
      if (!algorithm) {
         try {
            const keyObject = crypto.createPrivateKey(formattedKey);
            if (keyObject.asymmetricKeyType === 'rsa') {
               algorithm = JWT_ALGORITHM.RS256;
            } else if (keyObject.asymmetricKeyType === 'ec') {
               algorithm = JWT_ALGORITHM.ES256;
            } else {
               algorithm = DEFAULT_JWT_ALGORITHM;
            }
         } catch {
            algorithm = DEFAULT_JWT_ALGORITHM;
         }
      }

      const signOptions: SignOptions = {
         algorithm,
         keyid: options?.keyid || DEFAULT_JWT_KEY_ID,
         issuer: options?.issuer || DEFAULT_JWT_ISSUER,
         audience: options?.audience || DEFAULT_JWT_AUDIENCE,
         expiresIn: expiresInSeconds,
         ...options,
      };

      return jwt.sign(cleanPayload, formattedKey, signOptions);
   }

   static verify(
      token: string,
      publicKeyOrJwks: string | IJwksResponse = DEFAULT_DEV_EC_PUBLIC_KEY,
      options?: VerifyOptions,
   ): JwtPayload {
      let resolvedKey: string;

      if (typeof publicKeyOrJwks === 'object' && publicKeyOrJwks !== null && 'keys' in publicKeyOrJwks) {
         const decodedToken = jwt.decode(token, { complete: true });
         const kid = decodedToken?.header?.kid;
         const alg = decodedToken?.header?.alg;

         const jwksKey = this.resolveKeyFromJwks(publicKeyOrJwks, kid, alg);
         if (!jwksKey) {
            throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
               params: { reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED },
            });
         }
         resolvedKey = jwksKey;
      } else {
         resolvedKey = typeof publicKeyOrJwks === 'string' ? this.formatPemKey(publicKeyOrJwks) : publicKeyOrJwks;
      }

      let defaultAlgorithms: Algorithm[] = [JWT_ALGORITHM.ES256];
      if (typeof publicKeyOrJwks === 'object' && publicKeyOrJwks !== null && 'keys' in publicKeyOrJwks) {
         const jwksAlgs = publicKeyOrJwks.keys.map((k) => k.alg).filter(Boolean) as Algorithm[];
         if (jwksAlgs.length > 0) {
            defaultAlgorithms = Array.from(new Set([...defaultAlgorithms, ...jwksAlgs]));
         }
      }

      const verifyOptions: VerifyOptions = {
         algorithms: options?.algorithms || defaultAlgorithms,
         ...options,
      };

      try {
         const decoded = jwt.verify(token, resolvedKey, verifyOptions);
         if (typeof decoded === 'string' || !decoded) {
            throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
               params: { reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED },
            });
         }
         return decoded as JwtPayload;
      } catch (err: unknown) {
         if (err instanceof UnauthorizedException) {
            throw err;
         }
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED },
         });
      }
   }

   static decode<T = JwtPayload>(
      token: string,
      options: { complete: true } & jwt.DecodeOptions,
   ): JwtCompleteToken<T> | null;

   static decode<T = JwtPayload>(token: string, options?: { complete?: false } & jwt.DecodeOptions): T | null;

   static decode<T = JwtPayload>(token: string, options?: jwt.DecodeOptions): JwtCompleteToken<T> | T | null;

   static decode(token: string, options?: jwt.DecodeOptions): unknown {
      const decoded = jwt.decode(token, options);
      if (!decoded || typeof decoded === 'string') {
         return null;
      }
      return decoded;
   }
}
