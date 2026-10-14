import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '@contracts/user/dto/user/user-response.dto';

export class UserAvatarUploadResponseDto {
   @ApiProperty({
      description: 'Public CDN URL of the newly uploaded avatar image',
      example: 'https://res.cloudinary.com/demo/image/upload/v1612345678/omni/users/avatars/avatar_123.jpg',
   })
   avatarUrl!: string;

   @ApiProperty({
      description: 'Cloudinary public ID identifier for the stored avatar',
      example: 'omni/users/avatars/avatar_123_1712839200',
   })
   publicId!: string;

   @ApiPropertyOptional({
      description: 'Updated user entity with new avatar URL',
      type: () => UserResponseDto,
   })
   user?: UserResponseDto;
}
