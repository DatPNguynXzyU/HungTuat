import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
   MEDIA_TYPES,
   type MediaType,
   MEDIA_STATUSES,
   MEDIA_ERROR_CODES,
   type GetUploadUrlDto,
   type UploadFileDto,
   type ConfirmUploadDto,
   type MediaResponseDto,
   type UploadUrlResponseDto,
} from '@contracts/media';
import { NotFoundException, ForbiddenException, checkOwnershipOrAdmin, type IServiceMessage } from '@common';
import type { Media } from '@media/prisma-client';
import { StorageStrategyFactory } from '@media/storage';
import { MEDIA_REPOSITORY, type IMediaRepository } from '@media/modules/media/repositories/media.repository.interface';

@Injectable()
export class MediaService {
   private readonly logger = new Logger(MediaService.name);

   constructor(
      @Inject(MEDIA_REPOSITORY)
      private readonly mediaRepository: IMediaRepository,
      private readonly storageStrategyFactory: StorageStrategyFactory,
   ) {}

   async getUploadUrl(userId: string, dto: GetUploadUrlDto): Promise<UploadUrlResponseDto> {
      const type = dto.type || this.inferMediaType(dto.mimeType);
      const providerInstance = this.storageStrategyFactory.getProvider(dto.provider, type);

      const ext = dto.fileName.includes('.') ? dto.fileName.split('.').pop() : '';
      const uniqueFileName = `${Date.now()}_${randomUUID().slice(0, 8)}${ext ? `.${ext}` : ''}`;
      const folder = dto.folder || `omni/${type.toLowerCase()}s`;
      const fullKey = `${folder}/${uniqueFileName}`;

      const uploadResult = await providerInstance.generateUploadUrl({
         key: uniqueFileName,
         folder,
         mimeType: dto.mimeType,
         type,
         size: dto.size,
         userId,
      });

      // Reserve record in PENDING state
      const media = await this.mediaRepository.create({
         userId,
         provider: providerInstance.provider,
         type,
         url: uploadResult.publicUrl,
         key: fullKey,
         mimeType: dto.mimeType,
         size: dto.size || 0,
         status: MEDIA_STATUSES.PENDING,
      });

      this.logger.log(`Created pending media record ${media.id} for user ${userId} via ${providerInstance.provider}`);

      return {
         mediaId: media.id,
         provider: providerInstance.provider,
         method: uploadResult.method,
         uploadUrl: uploadResult.uploadUrl,
         publicUrl: uploadResult.publicUrl,
         key: fullKey,
         signature: uploadResult.signature,
         timestamp: uploadResult.timestamp,
         apiKey: uploadResult.apiKey,
         cloudName: uploadResult.cloudName,
         headers: uploadResult.headers,
      };
   }

   async uploadFile(userId: string, dto: UploadFileDto): Promise<MediaResponseDto> {
      const mimeType = dto.mimeType || 'image/jpeg';
      const type = dto.type || this.inferMediaType(mimeType);
      const providerInstance = this.storageStrategyFactory.getProvider(dto.provider, type);

      const folder = dto.folder || `omni/${type.toLowerCase()}s`;
      const ext = dto.fileName?.includes('.') ? dto.fileName.split('.').pop() : '';
      const uniqueFileName = `${Date.now()}_${randomUUID().slice(0, 8)}${ext ? `.${ext}` : ''}`;
      const fullKey = `${folder}/${uniqueFileName}`;

      const uploadResult = await providerInstance.uploadBase64(dto.fileBase64, {
         key: uniqueFileName,
         folder,
         mimeType,
      });

      const media = await this.mediaRepository.create({
         userId,
         provider: providerInstance.provider,
         type,
         url: uploadResult.url,
         key: uploadResult.key || fullKey,
         mimeType,
         size: uploadResult.bytes || 0,
         status: MEDIA_STATUSES.READY,
         metadata: {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
         },
      });

      this.logger.log(`Directly uploaded media ${media.id} for user ${userId} to ${providerInstance.provider}`);
      return this.mapToResponse(media);
   }

   async confirmUpload(userId: string, dto: ConfirmUploadDto): Promise<MediaResponseDto> {
      const media = await this.mediaRepository.findById(dto.mediaId);
      if (!media) {
         throw new NotFoundException(MEDIA_ERROR_CODES.MEDIA_NOT_FOUND, {
            params: { mediaId: dto.mediaId },
         });
      }

      if (media.userId !== userId) {
         throw new ForbiddenException(MEDIA_ERROR_CODES.CONFIRMATION_FAILED);
      }

      const updated = await this.mediaRepository.update(dto.mediaId, {
         status: MEDIA_STATUSES.READY,
         size: dto.size ?? media.size,
         key: dto.key ?? media.key,
         metadata: {
            width: dto.width,
            height: dto.height,
         },
      });

      this.logger.log(`Confirmed media upload ${updated.id} status to READY`);
      return this.mapToResponse(updated);
   }

   async getMediaById(id: string): Promise<MediaResponseDto> {
      const media = await this.mediaRepository.findById(id);
      if (!media) {
         throw new NotFoundException(MEDIA_ERROR_CODES.MEDIA_NOT_FOUND, {
            params: { id },
         });
      }
      return this.mapToResponse(media);
   }

   async deleteMedia(id: string, message: IServiceMessage<unknown>): Promise<boolean> {
      const media = await this.mediaRepository.findById(id);
      if (!media) {
         throw new NotFoundException(MEDIA_ERROR_CODES.MEDIA_NOT_FOUND, {
            params: { id },
         });
      }

      checkOwnershipOrAdmin(message, media.userId);

      const providerInstance = this.storageStrategyFactory.getProvider(media.provider);
      await providerInstance.deleteFile(media.key);
      await this.mediaRepository.delete(id);

      this.logger.log(`Deleted media ${id} from storage ${media.provider} and database`);
      return true;
   }

   private inferMediaType(mimeType: string): MediaType {
      if (mimeType.startsWith('image/')) {
         return MEDIA_TYPES.IMAGE;
      }
      if (mimeType.startsWith('video/')) {
         return MEDIA_TYPES.VIDEO;
      }
      if (mimeType.startsWith('audio/')) {
         return MEDIA_TYPES.AUDIO;
      }
      return MEDIA_TYPES.DOCUMENT;
   }

   private mapToResponse(media: Media): MediaResponseDto {
      return {
         id: media.id,
         userId: media.userId,
         provider: media.provider,
         type: media.type,
         url: media.url,
         key: media.key,
         mimeType: media.mimeType,
         size: media.size,
         status: media.status,
         metadata: (media.metadata as Record<string, unknown>) ?? null,
         createdAt: media.createdAt,
         updatedAt: media.updatedAt,
      };
   }
}
