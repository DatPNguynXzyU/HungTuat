import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { defer, firstValueFrom } from 'rxjs';
import {
   CircuitBreakerRegistry,
   createGrpcMetadata,
   handleGrpcError,
   RetryPolicyRegistry,
   withGrpcRetry,
} from '@common';
import {
   formatAvatarFileName,
   MEDIA_FOLDERS,
   MEDIA_TYPES,
   MEDIA_V1_GRPC_CLIENT,
   MEDIA_V1_GRPC_SERVICE_NAME,
   type IMediaProto,
   type IMediaV1GrpcService,
   type MediaResponseDto,
   type UploadUrlResponseDto,
} from '@contracts/media';
import type { IMediaAdapter, UploadAvatarParams } from '@user/adapters/media/media.adapter.interface';

@Injectable()
export class GrpcMediaAdapter implements IMediaAdapter, OnModuleInit {
   private mediaGrpcService!: IMediaV1GrpcService;

   private readonly mediaGrpcBreaker = CircuitBreakerRegistry.getOrCreate(MEDIA_V1_GRPC_SERVICE_NAME, {
      timeout: 10000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });

   private readonly mediaGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(MEDIA_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(
      @Inject(MEDIA_V1_GRPC_CLIENT)
      private readonly mediaGrpcClient: ClientGrpc,
   ) {}

   onModuleInit(): void {
      this.mediaGrpcService = this.mediaGrpcClient.getService<IMediaV1GrpcService>(MEDIA_V1_GRPC_SERVICE_NAME);
   }

   private mapProtoToMediaResponse(proto: IMediaProto): MediaResponseDto {
      let parsedMetadata: Record<string, unknown> | null = null;
      if (proto.metadataJson) {
         try {
            parsedMetadata = JSON.parse(proto.metadataJson) as Record<string, unknown>;
         } catch {
            parsedMetadata = null;
         }
      }
      return {
         id: proto.id,
         userId: proto.userId,
         provider: proto.provider as never,
         type: proto.type as never,
         url: proto.url,
         key: proto.key,
         mimeType: proto.mimeType,
         size: Number(proto.size) || 0,
         status: proto.status as never,
         metadata: parsedMetadata,
         createdAt: new Date(proto.createdAt),
         updatedAt: new Date(proto.updatedAt),
      };
   }

   async uploadAvatar(params: UploadAvatarParams): Promise<MediaResponseDto> {
      try {
         const { userId, fileBase64, mimeType } = params;
         const formattedBase64 =
            mimeType && !fileBase64.startsWith('data:') ? `data:${mimeType};base64,${fileBase64}` : fileBase64;
         const metadata = createGrpcMetadata({ userId });

         const res = await this.mediaGrpcBreaker.execute(async () =>
            firstValueFrom(
               defer(() =>
                  this.mediaGrpcService.uploadFile(
                     {
                        fileBase64: formattedBase64,
                        fileName: formatAvatarFileName(userId),
                        mimeType: mimeType || 'image/jpeg',
                        type: MEDIA_TYPES.IMAGE,
                        folder: MEDIA_FOLDERS.AVATARS,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.mediaGrpcRetryPolicy)),
            ),
         );

         return this.mapProtoToMediaResponse(res.media);
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getAvatarUploadSignature(userId: string): Promise<UploadUrlResponseDto> {
      try {
         const metadata = createGrpcMetadata({ userId });

         const res = await this.mediaGrpcBreaker.execute(async () =>
            firstValueFrom(
               defer(() =>
                  this.mediaGrpcService.getUploadUrl(
                     {
                        fileName: formatAvatarFileName(userId),
                        mimeType: 'image/jpeg',
                        type: MEDIA_TYPES.IMAGE,
                        folder: MEDIA_FOLDERS.AVATARS,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.mediaGrpcRetryPolicy)),
            ),
         );

         return {
            mediaId: res.mediaId,
            provider: res.provider as never,
            method: res.method,
            uploadUrl: res.uploadUrl,
            publicUrl: res.publicUrl,
            key: res.key,
            signature: res.signature,
            timestamp: res.timestamp ? Number(res.timestamp) : undefined,
            apiKey: res.apiKey,
            cloudName: res.cloudName,
            headers: res.headers,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }
}
