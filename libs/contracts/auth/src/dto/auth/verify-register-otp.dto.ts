import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyRegisterOtpDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   email: string;

   @ApiProperty({
      example: '123456',
      description: '6-digit OTP verification code received via email',
   })
   @IsString({ message: 'OTP must be a string' })
   @IsNotEmpty({ message: 'OTP must not be empty' })
   @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
   otp: string;
}

export class VerifyRegisterOtpResponseDto {
   @ApiProperty({
      example: true,
      description: 'Indicates whether the OTP was verified successfully',
   })
   success: boolean;

   @ApiProperty({
      example: 'vtok_123e4567e89b12d3a456426614174000',
      description: 'Single-use verification token required to complete registration with password',
   })
   verificationToken: string;

   @ApiProperty({
      example: 900,
      description: 'Verification token validity period in seconds (15 minutes)',
   })
   expiresInSeconds: number;
}
