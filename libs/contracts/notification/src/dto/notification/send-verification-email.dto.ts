import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendVerificationEmailDto {
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
      example: 'https://app.omniservices.dev/verify-email?token=abcdef123456',
      description: 'Email verification URL',
   })
   @IsString()
   @IsNotEmpty()
   verificationUrl: string;

   @ApiPropertyOptional({
      example: 'abcdef123456',
      description: 'Verification token string',
   })
   @IsString()
   @IsOptional()
   token?: string;

   @ApiPropertyOptional({
      example: 'en',
      description: 'Preferred recipient language / locale (e.g. en, vi)',
   })
   @IsString()
   @IsOptional()
   locale?: string;

   @ApiPropertyOptional({
      example: 'a0000000-0000-0000-0000-000000000001',
      description: 'Unique event ID for idempotency tracking',
   })
   @IsString()
   @IsOptional()
   eventId?: string;
}
