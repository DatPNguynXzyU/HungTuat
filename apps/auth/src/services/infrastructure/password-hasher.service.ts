import { Injectable } from '@nestjs/common';
import argon2, { type VerifyOptions } from 'argon2';
import { AuthConfigService } from '@auth/config';
import type { IPasswordHasher } from './password-hasher.interface';

/**
 * Concrete implementation of IPasswordHasher using Argon2id.
 * Encapsulates the application secret pepper from AuthConfigService and optimal hashing parameters.
 */
@Injectable()
export class PasswordHasherService implements IPasswordHasher {
   constructor(private readonly config: AuthConfigService) {}

   private resolveSecret(): Buffer | undefined {
      const secret = this.config.argon2Secret;
      if (!secret) {
         return undefined;
      }
      return Buffer.from(secret);
   }

   async hash(password: string): Promise<string> {
      const secret = this.resolveSecret();
      return argon2.hash(password, {
         type: argon2.argon2id,
         ...(secret ? { secret } : {}),
      });
   }

   async verify(hashedPassword: string, candidate: string): Promise<boolean> {
      try {
         const secret = this.resolveSecret();
         const options: VerifyOptions = secret ? { secret } : {};
         return await argon2.verify(hashedPassword, candidate, options);
      } catch {
         return false;
      }
   }
}
