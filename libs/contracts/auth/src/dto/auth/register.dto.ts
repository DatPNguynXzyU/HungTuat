import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Match } from '@common';

export class RegisterDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   email: string;

   @ApiProperty({
      example: 'password123',
      description: 'User password (min 6 characters)',
   })
   @IsString({ message: 'Password must be a string' })
   @MinLength(6, { message: 'Password must be at least 6 characters long' })
   @MaxLength(100, { message: 'Password must not exceed 100 characters' })
   password: string;

   @ApiProperty({
      example: 'password123',
      description: 'Confirm user password (must match password)',
   })
   @IsString({ message: 'Confirm password must be a string' })
   @IsNotEmpty({ message: 'Confirm password must not be empty' })
   @Match('password', { message: 'Confirm password does not match password' })
   confirmPassword: string;

   @ApiPropertyOptional({
      example: 'vtok_123e4567e89b12d3a456426614174000',
      description: 'Verification token obtained from verify-otp step to confirm email ownership',
   })
   @IsOptional()
   @IsString()
   verificationToken?: string;

   @ApiPropertyOptional({
      example: 'device-uuid-12345',
      description: 'Unique device identifier for mobile/desktop clients',
   })
   @IsOptional()
   @IsString()
   deviceId?: string;

   @ApiPropertyOptional({
      example: 'mobile',
      description: 'Client type',
      enum: ['web', 'mobile', 'desktop'],
   })
   @IsOptional()
   @IsEnum(['web', 'mobile', 'desktop'])
   clientType?: 'web' | 'mobile' | 'desktop';

   @ApiPropertyOptional({
      example: '1.0.0',
      description: 'Application version for mobile/desktop clients',
   })
   @IsOptional()
   @IsString()
   appVersion?: string;
}
