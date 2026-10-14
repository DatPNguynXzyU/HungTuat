import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MEDIA_PROVIDERS, type MediaProvider } from '@contracts/media';
import { MediaConfigService } from '@media/config';
import type {
   IStorageProvider,
   GenerateUploadOptions,
   UploadOptions,
   UploadSignatureResult,
   StorageUploadResult,
} from '@media/storage/storage.interface';

@Injectable()
export class CloudflareR2Provider implements IStorageProvider {
   readonly provider: MediaProvider = MEDIA_PROVIDERS.CLOUDFLARE_R2;
   private readonly logger = new Logger(CloudflareR2Provider.name);
   private readonly s3Client: S3Client;
   private readonly bucketName: string;
   private readonly publicBaseUrl: string;

   constructor(private readonly config: MediaConfigService) {
      const { accessKeyId, secretAccessKey, endpoint, bucketName, publicUrl } = this.config.r2;

      this.bucketName = bucketName;
      this.publicBaseUrl = publicUrl ? publicUrl.replace(/\/$/, '') : '';

      this.s3Client = new S3Client({
         region: 'auto',
         endpoint: endpoint || undefined,
         credentials:
            accessKeyId && secretAccessKey
               ? {
                    accessKeyId,
                    secretAccessKey,
                 }
               : undefined,
      });

      if (accessKeyId && secretAccessKey && endpoint && bucketName) {
         this.logger.log(`Cloudflare R2 configured successfully for bucket: ${bucketName}`);
      } else {
         this.logger.warn('Cloudflare R2 credentials missing or incomplete in configuration');
      }
   }

   async generateUploadUrl(options: GenerateUploadOptions): Promise<UploadSignatureResult> {
      const fullKey = options.folder ? `${options.folder.replace(/\/$/, '')}/${options.key}` : options.key;

      const command = new PutObjectCommand({
         Bucket: this.bucketName,
         Key: fullKey,
         ContentType: options.mimeType,
         ContentLength: options.size,
      });

      // Presigned PUT URL valid for 1 hour (3600 seconds)
      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      const publicUrl = this.getPublicUrl(fullKey);

      return {
         provider: this.provider,
         method: 'PUT',
         uploadUrl,
         publicUrl,
         key: fullKey,
         headers: {
            'Content-Type': options.mimeType,
         },
      };
   }

   async uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<StorageUploadResult> {
      const fullKey = options.folder ? `${options.folder.replace(/\/$/, '')}/${options.key}` : options.key;

      const command = new PutObjectCommand({
         Bucket: this.bucketName,
         Key: fullKey,
         Body: buffer,
         ContentType: options.mimeType || 'application/octet-stream',
      });

      await this.s3Client.send(command);
      const url = this.getPublicUrl(fullKey);

      return {
         provider: this.provider,
         key: fullKey,
         url,
         bytes: buffer.length,
      };
   }

   async uploadBase64(base64Data: string, options: UploadOptions): Promise<StorageUploadResult> {
      try {
         const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
         const buffer = Buffer.from(cleanBase64, 'base64');
         return await this.uploadBuffer(buffer, options);
      } catch (error) {
         this.logger.error(`Cloudflare R2 base64 upload failed: ${(error as Error).message}`);
         throw error;
      }
   }

   async deleteFile(key: string): Promise<boolean> {
      try {
         const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
         });
         await this.s3Client.send(command);
         return true;
      } catch (error) {
         this.logger.warn(`Failed to delete file ${key} from Cloudflare R2: ${(error as Error).message}`);
         throw error;
      }
   }

   getPublicUrl(key: string): string {
      if (this.publicBaseUrl) {
         return `${this.publicBaseUrl}/${key.replace(/^\//, '')}`;
      }
      return `${this.config.r2.endpoint}/${this.bucketName}/${key.replace(/^\//, '')}`;
   }
}
