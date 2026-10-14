import { Injectable, Logger } from '@nestjs/common';
import {
   v2 as cloudinary,
   type UploadApiResponse,
   type UploadApiErrorResponse,
   type UploadApiOptions,
} from 'cloudinary';
import { MEDIA_PROVIDERS, type MediaProvider } from '@contracts/media';
import { MediaConfigService } from '@media/config';
import type {
   IStorageProvider,
   GenerateUploadOptions,
   UploadOptions,
   UploadSignatureResult,
   StorageUploadResult,
} from '../storage.interface';

@Injectable()
export class CloudinaryProvider implements IStorageProvider {
   readonly provider: MediaProvider = MEDIA_PROVIDERS.CLOUDINARY;
   private readonly logger = new Logger(CloudinaryProvider.name);

   constructor(private readonly config: MediaConfigService) {
      const { cloudName, apiKey, apiSecret } = this.config.cloudinary;
      if (cloudName && apiKey && apiSecret) {
         cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
         });
         this.logger.log(`Cloudinary configured successfully for cloud: ${cloudName}`);
      } else {
         this.logger.warn('Cloudinary credentials missing in configuration');
      }
   }

   generateUploadUrl(options: GenerateUploadOptions): Promise<UploadSignatureResult> {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const { apiKey, apiSecret, cloudName } = this.config.cloudinary;

      const paramsToSign: Record<string, string | number> = {
         timestamp,
         public_id: options.key,
      };

      if (options.folder) {
         paramsToSign.folder = options.folder;
      }
      if (options.tags && options.tags.length > 0) {
         paramsToSign.tags = options.tags.join(',');
      }

      const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
      const publicUrl = this.getPublicUrl(options.folder ? `${options.folder}/${options.key}` : options.key);

      return Promise.resolve({
         provider: this.provider,
         method: 'POST',
         uploadUrl,
         publicUrl,
         key: options.key,
         signature,
         timestamp,
         apiKey,
         cloudName,
      });
   }

   async uploadBuffer(buffer: Buffer, options: UploadOptions): Promise<StorageUploadResult> {
      const uploadOptions: UploadApiOptions = {
         resource_type: 'auto',
         public_id: options.key,
         folder: options.folder,
         tags: options.tags,
         transformation: options.transformation,
      };

      return new Promise((resolve, reject) => {
         const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
               if (error) {
                  this.logger.error(`Cloudinary buffer upload failed: ${error.message}`);
                  return reject(new Error(error.message || 'Cloudinary upload failed'));
               }
               if (!result) {
                  return reject(new Error('Cloudinary upload returned empty response'));
               }
               resolve({
                  provider: this.provider,
                  key: result.public_id,
                  url: result.secure_url,
                  format: result.format,
                  bytes: result.bytes,
                  width: result.width,
                  height: result.height,
               });
            },
         );
         uploadStream.end(buffer);
      });
   }

   async uploadBase64(base64Data: string, options: UploadOptions): Promise<StorageUploadResult> {
      try {
         const dataUri = base64Data.startsWith('data:')
            ? base64Data
            : `data:${options.mimeType || 'image/jpeg'};base64,${base64Data}`;

         const uploadOptions: UploadApiOptions = {
            resource_type: 'auto',
            public_id: options.key,
            folder: options.folder,
            tags: options.tags,
            transformation: options.transformation,
         };

         const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

         return {
            provider: this.provider,
            key: result.public_id,
            url: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
         };
      } catch (error) {
         this.logger.error(`Cloudinary base64 upload failed: ${(error as Error).message}`);
         throw error;
      }
   }

   async deleteFile(key: string): Promise<boolean> {
      try {
         const result = (await cloudinary.uploader.destroy(key)) as { result?: string };
         return result.result === 'ok';
      } catch (error) {
         this.logger.warn(`Failed to delete file ${key} from Cloudinary: ${(error as Error).message}`);
         throw error;
      }
   }

   getPublicUrl(key: string): string {
      return cloudinary.url(key, {
         secure: true,
         quality: 'auto',
         fetch_format: 'auto',
      });
   }
}
