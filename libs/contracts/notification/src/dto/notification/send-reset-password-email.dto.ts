import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendResetPasswordEmailDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'Recipient email address',
   })
   @IsEmail()
   @IsNotEmpty()
   to: string;

   @ApiProperty({
      example: 'Nguyen Van A',
      description: 'Recipient full name',
   })
   @IsString()
   @IsNotEmpty()
   fullName: string;

   @ApiProperty({
      example: 'https://app.omniservices.dev/reset-password?token=abcdef123456',
      description: 'Password reset URL',
   })
   @IsString()
   @IsNotEmpty()
   resetUrl: string;

   @ApiPropertyOptional({
      example: 'abcdef123456',
      description: 'Reset token string',
   })
   @IsString()
   @IsOptional()
   token?: string;
}
