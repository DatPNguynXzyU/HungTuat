import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function generateRsaKeys(modulusLength: number = 2048): { privateKey: string; publicKey: string } {
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

export function writeKeyFiles(baseDir: string = process.cwd()): void {
   const { privateKey, publicKey } = generateRsaKeys(2048);

   const authKeysDir = path.resolve(baseDir, 'apps/auth/keys');
   const gatewayKeysDir = path.resolve(baseDir, 'apps/gateway/keys');

   fs.mkdirSync(authKeysDir, { recursive: true });
   fs.mkdirSync(gatewayKeysDir, { recursive: true });

   fs.writeFileSync(path.join(authKeysDir, 'private.key'), privateKey, { mode: 0o600 });
   fs.writeFileSync(path.join(authKeysDir, 'public.key'), publicKey, { mode: 0o644 });

   fs.writeFileSync(path.join(gatewayKeysDir, 'public.key'), publicKey, { mode: 0o644 });

   console.log('RSA Key pairs generated successfully:');
   console.log(`   - Auth Private Key:  ${path.join(authKeysDir, 'private.key')}`);
   console.log(`   - Auth Public Key:   ${path.join(authKeysDir, 'public.key')}`);
   console.log(`   - Gateway Public Key: ${path.join(gatewayKeysDir, 'public.key')}`);
}

if (require.main === module) {
   writeKeyFiles();
}
