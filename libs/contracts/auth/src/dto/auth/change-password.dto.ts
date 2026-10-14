import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Match } from '@common';

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

   @ApiProperty({
      example: 'newPassword123',
      description: 'Confirm new password (must match newPassword)',
   })
   @IsString({ message: 'Confirm password must be a string' })
   @IsNotEmpty({ message: 'Confirm password must not be empty' })
   @Match('newPassword', { message: 'Confirm password does not match new password' })
   confirmPassword: string;

   @ApiPropertyOptional({
      example: true,
      description: 'Whether to log out of all active sessions and devices after changing password',
      default: false,
   })
   @IsOptional()
   @IsBoolean({ message: 'logoutAll must be a boolean' })
   logoutAll?: boolean;
}
