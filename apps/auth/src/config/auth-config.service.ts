import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService, ENV_KEYS } from '@common';
import { AuthEnvConfig } from '@auth/config/auth-env.schema';

@Injectable()
export class AuthConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<AuthEnvConfig, true>) {
      super(configService);
   }

   get databaseUrl(): string {
      return this.configService.get(ENV_KEYS.DATABASE_URL, { infer: true });
   }

   get postgresUser(): string {
      return this.configService.get(ENV_KEYS.POSTGRES_USER, { infer: true });
   }

   get postgresPassword(): string {
      return this.configService.get(ENV_KEYS.POSTGRES_PASSWORD, { infer: true });
   }

   get postgresDb(): string {
      return this.configService.get(ENV_KEYS.POSTGRES_DB, { infer: true });
   }

   get postgresPort(): number {
      return this.configService.get(ENV_KEYS.POSTGRES_PORT, { infer: true });
   }

   get jwtExpiresIn(): number {
      return this.configService.get(ENV_KEYS.JWT_EXPIRES_IN, { infer: true });
   }

   override get jwtPrivateKeyPath(): string {
      return this.configService.get(ENV_KEYS.JWT_PRIVATE_KEY_PATH, { infer: true }) || 'apps/auth/keys/private.key';
   }

   override get jwtPublicKeyPath(): string {
      return this.configService.get(ENV_KEYS.JWT_PUBLIC_KEY_PATH, { infer: true }) || 'apps/auth/keys/public.key';
   }
}
