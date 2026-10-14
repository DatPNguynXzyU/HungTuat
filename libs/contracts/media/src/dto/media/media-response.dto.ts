import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
   MEDIA_PROVIDERS,
   type MediaProvider,
   MEDIA_TYPES,
   type MediaType,
   MEDIA_STATUSES,
   type MediaStatus,
} from '@contracts/media/constants/media.constant';

export class MediaResponseDto {
   @ApiProperty({
      description: 'Unique identifier of the media asset',
      example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
   })
   id!: string;

   @ApiProperty({
      description: 'User ID of the asset owner',
      example: 'a12b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
   })
   userId!: string;

   @ApiProperty({
      description: 'Storage provider hosting the media asset',
      enum: MEDIA_PROVIDERS,
      example: MEDIA_PROVIDERS.CLOUDFLARE_R2,
   })
   provider!: MediaProvider;

   @ApiProperty({
      description: 'Media category type',
      enum: MEDIA_TYPES,
      example: MEDIA_TYPES.VIDEO,
   })
   type!: MediaType;

   @ApiProperty({
      description: 'Publicly accessible CDN or storage URL',
      example: 'https://pub-50b1ab619efd4084959e011fe2e5a273.r2.dev/omni/posts/videos/video_123.mp4',
   })
   url!: string;

   @ApiProperty({
      description: 'Storage key or Cloudinary public ID',
      example: 'omni/posts/videos/video_123.mp4',
   })
   key!: string;

   @ApiProperty({
      description: 'MIME type of the media file',
      example: 'video/mp4',
   })
   mimeType!: string;

   @ApiProperty({
      description: 'Size of the media file in bytes',
      example: 10485760,
   })
   size!: number;

   @ApiProperty({
      description: 'Processing and upload status of the media asset',
      enum: MEDIA_STATUSES,
      example: MEDIA_STATUSES.READY,
   })
   status!: MediaStatus;

   @ApiPropertyOptional({
      description: 'Arbitrary provider-specific metadata (width, height, format, duration)',
      type: Object,
      example: { width: 1920, height: 1080, duration: 120.5 },
   })
   metadata?: Record<string, unknown> | null;

   @ApiProperty({
      description: 'Creation timestamp in ISO 8601 format',
      example: '2026-10-14T02:00:00.000Z',
   })
   createdAt!: Date;

   @ApiProperty({
      description: 'Last update timestamp in ISO 8601 format',
      example: '2026-10-14T02:05:00.000Z',
   })
   updatedAt!: Date;
}
