import { ApiProperty } from '@nestjs/swagger';

export class AvatarSignatureResponseDto {
   @ApiProperty({
      description: 'Cryptographic SHA-1 signature authorizing direct client upload to Cloudinary',
      example: 'bf9b9365c19dc5cf60b4a4cb88b39d1b0a82741d',
   })
   signature!: string;

   @ApiProperty({
      description: 'Unix timestamp in seconds when the upload signature was issued',
      example: 1712839200,
   })
   timestamp!: number;

   @ApiProperty({
      description: 'Public API Key for the Cloudinary service account',
      example: '123456789012345',
   })
   apiKey!: string;

   @ApiProperty({
      description: 'Cloudinary cloud name for resource destination',
      example: 'omniservices-cloud',
   })
   cloudName!: string;
}
