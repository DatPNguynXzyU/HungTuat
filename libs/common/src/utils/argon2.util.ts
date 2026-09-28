import argon2 from 'argon2';
import type { HashOptions, VerifyOptions } from 'argon2';

export interface Argon2Options extends Omit<HashOptions, 'secret'> {
   secret?: string | Buffer;
}

const resolveSecret = (secret?: string | Buffer): Buffer | undefined => {
   if (!secret) {
      return undefined;
   }
   return typeof secret === 'string' ? Buffer.from(secret) : secret;
};

const parseOptions = <T extends HashOptions | VerifyOptions>(
   secretOrOptions?: string | Buffer | Argon2Options,
   options?: Argon2Options,
): T => {
   if (typeof secretOrOptions === 'string' || Buffer.isBuffer(secretOrOptions)) {
      const secret = resolveSecret(secretOrOptions);
      return { ...options, ...(secret ? { secret } : {}) } as T;
   }

   const secret = resolveSecret(secretOrOptions?.secret);
   return { ...secretOrOptions, ...(secret ? { secret } : {}) } as T;
};

export class Argon2Util {
   static async hash(
      password: string | Buffer,
      secretOrOptions?: string | Buffer | Argon2Options,
      options?: Argon2Options,
   ): Promise<string> {
      return argon2.hash(password, {
         type: argon2.argon2id,
         ...parseOptions<HashOptions>(secretOrOptions, options),
         raw: false,
      });
   }

   static async verify(
      hash: string,
      password: string | Buffer,
      secretOrOptions?: string | Buffer | Argon2Options,
      options?: Argon2Options,
   ): Promise<boolean> {
      try {
         return await argon2.verify(hash, password, parseOptions<VerifyOptions>(secretOrOptions, options));
      } catch {
         return false;
      }
   }
}
