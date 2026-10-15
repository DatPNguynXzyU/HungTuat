import type { MediaResponseDto, UploadUrlResponseDto } from '@contracts/media';

export const MEDIA_ADAPTER = Symbol('MEDIA_ADAPTER');

export interface UploadAvatarParams {
   userId: string;
   fileBase64: string;
   mimeType?: string;
}

/**
 * Port contract for Media microservice operations.
 * Follows the Ports & Adapters (Hexagonal Architecture) pattern,
 * decoupling User domain and profile services from RabbitMQ ClientProxy transport.
 */
export interface IMediaAdapter {
   uploadAvatar(params: UploadAvatarParams): Promise<MediaResponseDto>;
   getAvatarUploadSignature(userId: string): Promise<UploadUrlResponseDto>;
}
