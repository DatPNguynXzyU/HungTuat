import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SendChangePasswordOtpEmailDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'Recipient email address',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   to: string;

   @ApiProperty({
      example: '123456',
      description: '6-digit OTP code for password change verification',
   })
   @IsString({ message: 'OTP code must be a string' })
   @IsNotEmpty({ message: 'OTP code must not be empty' })
   otpCode: string;

   @ApiProperty({
      example: 10,
      description: 'OTP expiration time in minutes',
      required: false,
   })
   @IsNumber({}, { message: 'Expiration time must be a number' })
   @Min(1, { message: 'Expiration time must be at least 1 minute' })
   @IsOptional()
   expiresInMinutes?: number;

   @ApiProperty({
      example: 'John Doe',
      description: 'Recipient full name',
      required: false,
   })
   @IsString({ message: 'Full name must be a string' })
   @IsOptional()
   fullName?: string;

   @ApiProperty({
      example: 'en',
      description: 'Preferred recipient language / locale (e.g. en, vi)',
      required: false,
   })
   @IsString({ message: 'Locale must be a string' })
   @IsOptional()
   locale?: string;
}
