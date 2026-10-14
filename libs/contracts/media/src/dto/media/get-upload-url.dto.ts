import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MEDIA_TYPES, type MediaType, MEDIA_PROVIDERS, type MediaProvider } from '../../constants/media.constant';

export class GetUploadUrlDto {
   @ApiProperty({
      description: 'Original name of the file including extension',
      example: 'intro-video.mp4',
   })
   @IsString()
   @IsNotEmpty()
   fileName!: string;

   @ApiProperty({
      description: 'MIME type of the media file',
      example: 'video/mp4',
   })
   @IsString()
   @IsNotEmpty()
   mimeType!: string;

   @ApiPropertyOptional({
      description: 'Media classification type (IMAGE, VIDEO, AUDIO, DOCUMENT)',
      enum: MEDIA_TYPES,
      example: MEDIA_TYPES.VIDEO,
   })
   @IsOptional()
   @IsEnum(MEDIA_TYPES)
   type?: MediaType;

   @ApiPropertyOptional({
      description: 'Target storage provider override (CLOUDINARY, CLOUDFLARE_R2)',
      enum: MEDIA_PROVIDERS,
      example: MEDIA_PROVIDERS.CLOUDFLARE_R2,
   })
   @IsOptional()
   @IsEnum(MEDIA_PROVIDERS)
   provider?: MediaProvider;

   @ApiPropertyOptional({
      description: 'Approximate file size in bytes',
      example: 10485760,
   })
   @IsOptional()
   @IsNumber()
   size?: number;

   @ApiPropertyOptional({
      description: 'Destination directory or folder namespace for organizing assets',
      example: 'omni/posts/videos',
   })
   @IsOptional()
   @IsString()
   folder?: string;
}
