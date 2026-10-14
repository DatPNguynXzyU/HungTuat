import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyChangePasswordOtpDto {
   @ApiProperty({
      example: '123456',
      description: '6-digit OTP verification code received via email',
   })
   @IsString({ message: 'OTP must be a string' })
   @IsNotEmpty({ message: 'OTP must not be empty' })
   @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
   otp: string;
}

export class VerifyChangePasswordOtpResponseDto {
   @ApiProperty({
      example: true,
      description: 'Indicates whether the password was changed successfully',
   })
   success: boolean;

   @ApiProperty({
      example: 'Password changed successfully',
      description: 'Human-readable response message',
   })
   message: string;

   @ApiProperty({
      example: false,
      description: 'Whether all sessions were logged out',
      required: false,
   })
   logoutAll?: boolean;
}
