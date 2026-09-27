import * as crypto from 'crypto';

function scryptPromise(password: string, salt: string, keylen: number): Promise<Buffer> {
   return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
         if (err) {
            return reject(err);
         }
         resolve(derivedKey);
      });
   });
}

export class Argon2Util {
   static async hash(password: string): Promise<string> {
      const salt = crypto.randomBytes(16).toString('hex');
      const derivedKey = await scryptPromise(password, salt, 64);
      return `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${derivedKey.toString('hex')}`;
   }

   static async verify(hash: string, password: string): Promise<boolean> {
      const parts = hash.split('$');
      if (parts.length < 5) {
         return false;
      }
      const salt = parts[4];
      const key = parts[5];
      const derivedKey = await scryptPromise(password, salt, 64);

      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length !== derivedKey.length) {
         return false;
      }
      return crypto.timingSafeEqual(keyBuffer, derivedKey);
   }
}
