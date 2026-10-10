import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { PostEnvConfig } from '@post/config/post-env.schema';

@Injectable()
export class PostConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<PostEnvConfig, true>) {
      super(configService);
   }

   get databaseUrl(): string {
      return this.configService.get('DATABASE_URL', { infer: true });
   }

   get postgresUser(): string {
      return this.configService.get('POSTGRES_USER', { infer: true });
   }

   get postgresPassword(): string {
      return this.configService.get('POSTGRES_PASSWORD', { infer: true });
   }

   get postgresDb(): string {
      return this.configService.get('POSTGRES_DB', { infer: true });
   }

   get postgresPort(): number {
      return this.configService.get('POSTGRES_PORT', { infer: true });
   }
}
