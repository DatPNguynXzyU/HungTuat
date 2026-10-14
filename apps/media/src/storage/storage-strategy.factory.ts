import { Injectable, Logger } from '@nestjs/common';
import { MEDIA_PROVIDERS, type MediaProvider, MEDIA_TYPES, type MediaType, MEDIA_ERROR_CODES } from '@contracts/media';
import { BadRequestException } from '@common';
import type { IStorageProvider } from '@media/storage/storage.interface';
import { CloudinaryProvider } from '@media/storage/providers/cloudinary.provider';
import { CloudflareR2Provider } from '@media/storage/providers/r2.provider';

@Injectable()
export class StorageStrategyFactory {
   private readonly logger = new Logger(StorageStrategyFactory.name);

   constructor(
      private readonly cloudinaryProvider: CloudinaryProvider,
      private readonly r2Provider: CloudflareR2Provider,
   ) {}

   getProvider(requestedProvider?: MediaProvider, mediaType?: MediaType): IStorageProvider {
      if (requestedProvider) {
         if (requestedProvider === MEDIA_PROVIDERS.CLOUDINARY) {
            return this.cloudinaryProvider;
         }
         if (requestedProvider === MEDIA_PROVIDERS.CLOUDFLARE_R2) {
            return this.r2Provider;
         }
         throw new BadRequestException(MEDIA_ERROR_CODES.UNSUPPORTED_PROVIDER, {
            params: { provider: requestedProvider },
         });
      }

      // Video, Audio, and Documents go to Cloudflare R2 (zero egress fee, high bandwidth)
      if (mediaType === MEDIA_TYPES.VIDEO || mediaType === MEDIA_TYPES.AUDIO || mediaType === MEDIA_TYPES.DOCUMENT) {
         this.logger.debug(`Routing ${mediaType} to Cloudflare R2 Provider`);
         return this.r2Provider;
      }

      // Images/Avatars default to Cloudinary (for on-the-fly transformations and face detection)
      this.logger.debug(`Routing ${mediaType || 'IMAGE'} to Cloudinary Provider`);
      return this.cloudinaryProvider;
   }
}
