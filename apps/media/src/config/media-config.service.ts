import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MEDIA_ENV_KEYS, type MediaEnvConfig } from '@media/config/media-env.schema';

@Injectable()
export class MediaConfigService {
   constructor(private readonly configService: ConfigService<MediaEnvConfig, true>) {}

   get serviceName(): string {
      return this.configService.get(MEDIA_ENV_KEYS.SERVICE_NAME, { infer: true });
   }

   get isProduction(): boolean {
      return this.configService.get(MEDIA_ENV_KEYS.NODE_ENV, { infer: true }) === 'production';
   }

   get databaseUrl(): string {
      const url = this.configService.get(MEDIA_ENV_KEYS.DATABASE_URL, { infer: true });
      if (url) {
         return url;
      }
      const user = this.configService.get(MEDIA_ENV_KEYS.POSTGRES_USER, { infer: true });
      const password = this.configService.get(MEDIA_ENV_KEYS.POSTGRES_PASSWORD, { infer: true });
      const db = this.configService.get(MEDIA_ENV_KEYS.POSTGRES_DB, { infer: true });
      const port = this.configService.get(MEDIA_ENV_KEYS.POSTGRES_PORT, { infer: true });
      return `postgresql://${user}:${password}@localhost:${port}/${db}`;
   }

   get rabbitMq() {
      return {
         uri: this.configService.get(MEDIA_ENV_KEYS.RABBIT_MQ_URI, { infer: true }),
         queue: this.configService.get(MEDIA_ENV_KEYS.RABBIT_MQ_MEDIA_SERVICE_QUEUE, { infer: true }),
      };
   }

   get cloudinary() {
      return {
         cloudName: this.configService.get(MEDIA_ENV_KEYS.CLOUDINARY_CLOUD_NAME, { infer: true }) || '',
         apiKey: this.configService.get(MEDIA_ENV_KEYS.CLOUDINARY_API_KEY, { infer: true }) || '',
         apiSecret: this.configService.get(MEDIA_ENV_KEYS.CLOUDINARY_API_SECRET, { infer: true }) || '',
      };
   }

   get r2() {
      return {
         accountId: this.configService.get(MEDIA_ENV_KEYS.R2_ACCOUNT_ID, { infer: true }) || '',
         accessKeyId: this.configService.get(MEDIA_ENV_KEYS.R2_ACCESS_KEY_ID, { infer: true }) || '',
         secretAccessKey: this.configService.get(MEDIA_ENV_KEYS.R2_SECRET_ACCESS_KEY, { infer: true }) || '',
         bucketName: this.configService.get(MEDIA_ENV_KEYS.R2_BUCKET_NAME, { infer: true }) || '',
         endpoint: this.configService.get(MEDIA_ENV_KEYS.R2_ENDPOINT, { infer: true }) || '',
         publicUrl: this.configService.get(MEDIA_ENV_KEYS.R2_PUBLIC_URL, { infer: true }) || '',
      };
   }
}
