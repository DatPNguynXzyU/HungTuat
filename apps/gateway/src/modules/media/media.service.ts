import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
   MEDIA_PATTERNS,
   type GetUploadUrlDto,
   type UploadFileDto,
   type ConfirmUploadDto,
   type MediaResponseDto,
   type UploadUrlResponseDto,
   type GetMediaByIdDto,
   type DeleteMediaDto,
   type DeleteMediaResponseDto,
} from '@contracts/media';
import { SERVICES, type JwtPayload } from '@common';

@Injectable()
export class MediaService {
   constructor(
      @Inject(SERVICES.MEDIA_SERVICE)
      private readonly mediaClient: ClientProxy,
   ) {}

   async getUploadUrl(dto: GetUploadUrlDto, user: JwtPayload): Promise<UploadUrlResponseDto> {
      return firstValueFrom(
         this.mediaClient.send<UploadUrlResponseDto>(
            { cmd: MEDIA_PATTERNS.GET_UPLOAD_URL },
            {
               data: dto,
               user: {
                  userId: user.sub,
                  roles: user.roles || [],
               },
            },
         ),
      );
   }

   async uploadFile(dto: UploadFileDto, user: JwtPayload): Promise<MediaResponseDto> {
      return firstValueFrom(
         this.mediaClient.send<MediaResponseDto>(
            { cmd: MEDIA_PATTERNS.UPLOAD_FILE },
            {
               data: dto,
               user: {
                  userId: user.sub,
                  roles: user.roles || [],
               },
            },
         ),
      );
   }

   async confirmUpload(dto: ConfirmUploadDto, user: JwtPayload): Promise<MediaResponseDto> {
      return firstValueFrom(
         this.mediaClient.send<MediaResponseDto>(
            { cmd: MEDIA_PATTERNS.CONFIRM_UPLOAD },
            {
               data: dto,
               user: {
                  userId: user.sub,
                  roles: user.roles || [],
               },
            },
         ),
      );
   }

   async getMediaById(id: string): Promise<MediaResponseDto> {
      const payload: GetMediaByIdDto = { id };
      return firstValueFrom(
         this.mediaClient.send<MediaResponseDto>(
            { cmd: MEDIA_PATTERNS.GET_MEDIA_BY_ID },
            {
               data: payload,
            },
         ),
      );
   }

   async deleteMedia(id: string, user: JwtPayload): Promise<DeleteMediaResponseDto> {
      const payload: DeleteMediaDto = { id };
      const result = await firstValueFrom(
         this.mediaClient.send<boolean>(
            { cmd: MEDIA_PATTERNS.DELETE_MEDIA },
            {
               data: payload,
               user: {
                  userId: user.sub,
                  roles: user.roles || [],
               },
            },
         ),
      );
      return { success: result };
   }
}
