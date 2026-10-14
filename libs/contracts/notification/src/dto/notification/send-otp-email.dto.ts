import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class SendOtpEmailDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'Recipient email address',
   })
   @IsEmail()
   @IsNotEmpty()
   to: string;

   @ApiProperty({
      example: '839201',
      description: 'One-time password (OTP) code',
   })
   @IsString()
   @IsNotEmpty()
   otpCode: string;

   @ApiPropertyOptional({
      example: 'Nguyen Van A',
      description: 'Recipient full name',
   })
   @IsString()
   @IsOptional()
   fullName?: string;

   @ApiPropertyOptional({
      example: 10,
      description: 'OTP validity time in minutes',
      default: 10,
   })
   @IsNumber()
   @IsOptional()
   expiresInMinutes?: number;
}
