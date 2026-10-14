import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MEDIA_TYPES, type MediaType, MEDIA_PROVIDERS, type MediaProvider } from '../../constants/media.constant';

export class UploadFileDto {
   @ApiProperty({
      description: 'Base64 encoded string of the file content',
      example:
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
   })
   @IsString()
   @IsNotEmpty()
   fileBase64!: string;

   @ApiPropertyOptional({
      description: 'Original name of the file with extension',
      example: 'avatar.png',
   })
   @IsOptional()
   @IsString()
   fileName?: string;

   @ApiPropertyOptional({
      description: 'MIME type of the media file',
      example: 'image/png',
   })
   @IsOptional()
   @IsString()
   mimeType?: string;

   @ApiPropertyOptional({
      description: 'Media classification type (IMAGE, VIDEO, AUDIO, DOCUMENT)',
      enum: MEDIA_TYPES,
      example: MEDIA_TYPES.IMAGE,
   })
   @IsOptional()
   @IsEnum(MEDIA_TYPES)
   type?: MediaType;

   @ApiPropertyOptional({
      description: 'Target storage provider override (CLOUDINARY, CLOUDFLARE_R2)',
      enum: MEDIA_PROVIDERS,
      example: MEDIA_PROVIDERS.CLOUDINARY,
   })
   @IsOptional()
   @IsEnum(MEDIA_PROVIDERS)
   provider?: MediaProvider;

   @ApiPropertyOptional({
      description: 'Destination directory or folder namespace for organizing assets',
      example: 'omni/users/avatars',
   })
   @IsOptional()
   @IsString()
   folder?: string;
}
