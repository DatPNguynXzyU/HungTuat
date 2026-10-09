import { Injectable, Logger } from '@nestjs/common';
import {
   v2 as cloudinary,
   type UploadApiResponse,
   type UploadApiErrorResponse,
   type UploadApiOptions,
} from 'cloudinary';
import type { CloudinaryConfig } from '@common/cloudinary/cloudinary.config';

export interface CloudinaryUploadResult {
   publicId: string;
   url: string;
   secureUrl: string;
   format: string;
   width: number;
   height: number;
   bytes: number;
}

@Injectable()
export class CloudinaryService {
   private readonly logger = new Logger(CloudinaryService.name);

   constructor(private readonly config: CloudinaryConfig) {
      if (this.config.cloudName && this.config.apiKey && this.config.apiSecret) {
         cloudinary.config({
            cloud_name: this.config.cloudName,
            api_key: this.config.apiKey,
            api_secret: this.config.apiSecret,
            secure: true,
         });
         this.logger.log(`Cloudinary configured successfully for cloud: ${this.config.cloudName}`);
      } else {
         this.logger.warn('Cloudinary credentials missing in configuration');
      }
   }

   async uploadBuffer(buffer: Buffer, options: UploadApiOptions = {}): Promise<CloudinaryUploadResult> {
      return new Promise((resolve, reject) => {
         const uploadStream = cloudinary.uploader.upload_stream(
            {
               resource_type: 'auto',
               ...options,
            },
            (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
               if (error) {
                  this.logger.error(`Cloudinary buffer upload failed: ${error.message}`);
                  return reject(new Error(error.message || 'Cloudinary upload failed'));
               }
               if (!result) {
                  return reject(new Error('Cloudinary upload returned empty response'));
               }
               resolve({
                  publicId: result.public_id,
                  url: result.url,
                  secureUrl: result.secure_url,
                  format: result.format,
                  width: result.width,
                  height: result.height,
                  bytes: result.bytes,
               });
            },
         );
         uploadStream.end(buffer);
      });
   }

   async uploadBase64(base64Data: string, options: UploadApiOptions = {}): Promise<CloudinaryUploadResult> {
      try {
         const dataUri = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
         const result = await cloudinary.uploader.upload(dataUri, {
            resource_type: 'auto',
            ...options,
         });

         return {
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
         };
      } catch (error) {
         this.logger.error(`Cloudinary base64 upload failed: ${(error as Error).message}`);
         throw error;
      }
   }

   async deleteFile(publicId: string): Promise<Record<string, unknown>> {
      try {
         const result = (await cloudinary.uploader.destroy(publicId)) as Record<string, unknown>;
         return result;
      } catch (error) {
         this.logger.warn(`Failed to delete file ${publicId} from Cloudinary: ${(error as Error).message}`);
         throw error;
      }
   }

   generateUploadSignature(paramsToSign: Record<string, string | number>): {
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
   } {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const params = {
         ...paramsToSign,
         timestamp,
      };
      const signature = cloudinary.utils.api_sign_request(params, this.config.apiSecret);

      return {
         signature,
         timestamp,
         apiKey: this.config.apiKey,
         cloudName: this.config.cloudName,
      };
   }

   getOptimizedUrl(
      publicId: string,
      options: { width?: number; height?: number; crop?: string; gravity?: string } = {},
   ): string {
      return cloudinary.url(publicId, {
         width: options.width ?? 200,
         height: options.height ?? 200,
         crop: options.crop ?? 'fill',
         gravity: options.gravity ?? 'face',
         fetch_format: 'auto',
         quality: 'auto',
         secure: true,
      });
   }
}
