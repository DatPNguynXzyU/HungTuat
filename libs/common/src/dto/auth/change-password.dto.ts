import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
   @ApiProperty({
      example: 'currentPassword123',
      description: 'Current password',
   })
   @IsString({ message: 'Current password must be a string' })
   @IsNotEmpty({ message: 'Current password must not be empty' })
   currentPassword: string;

   @ApiProperty({
      example: 'newPassword123',
      description: 'New password (min 6 characters)',
   })
   @IsString({ message: 'New password must be a string' })
   @MinLength(6, { message: 'New password must be at least 6 characters long' })
   @MaxLength(100, { message: 'New password must not exceed 100 characters' })
   newPassword: string;
}
