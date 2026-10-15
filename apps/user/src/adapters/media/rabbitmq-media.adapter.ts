import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@common';
import {
   MEDIA_PATTERNS,
   MEDIA_TYPES,
   MEDIA_FOLDERS,
   formatAvatarFileName,
   type MediaResponseDto,
   type UploadUrlResponseDto,
} from '@contracts/media';
import type { IMediaAdapter, UploadAvatarParams } from '@user/adapters/media/media.adapter.interface';

@Injectable()
export class RabbitMqMediaAdapter implements IMediaAdapter {
   constructor(
      @Inject(SERVICES.MEDIA_SERVICE)
      private readonly mediaClient: ClientProxy,
   ) {}

   async uploadAvatar(params: UploadAvatarParams): Promise<MediaResponseDto> {
      const { userId, fileBase64, mimeType } = params;

      const formattedBase64 =
         mimeType && !fileBase64.startsWith('data:') ? `data:${mimeType};base64,${fileBase64}` : fileBase64;

      return firstValueFrom(
         this.mediaClient.send<MediaResponseDto>(
            { cmd: MEDIA_PATTERNS.UPLOAD_FILE },
            {
               data: {
                  fileBase64: formattedBase64,
                  fileName: formatAvatarFileName(userId),
                  mimeType: mimeType || 'image/jpeg',
                  type: MEDIA_TYPES.IMAGE,
                  folder: MEDIA_FOLDERS.AVATARS,
               },
               user: { userId },
            },
         ),
      );
   }

   async getAvatarUploadSignature(userId: string): Promise<UploadUrlResponseDto> {
      return firstValueFrom(
         this.mediaClient.send<UploadUrlResponseDto>(
            { cmd: MEDIA_PATTERNS.GET_UPLOAD_URL },
            {
               data: {
                  fileName: formatAvatarFileName(userId),
                  mimeType: 'image/jpeg',
                  type: MEDIA_TYPES.IMAGE,
                  folder: MEDIA_FOLDERS.AVATARS,
               },
               user: { userId },
            },
         ),
      );
   }
}
