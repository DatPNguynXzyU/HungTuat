import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendRegisterOtpDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address to receive registration OTP verification code',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   email: string;
}

export class SendRegisterOtpResponseDto {
   @ApiProperty({
      example: true,
      description: 'Indicates whether the OTP was sent successfully',
   })
   success: boolean;

   @ApiProperty({
      example: 'OTP verification code has been sent to your email',
      description: 'Human-readable response message',
   })
   message: string;

   @ApiProperty({
      example: 60,
      description: 'Cooldown period in seconds before user can request another OTP',
   })
   cooldownSeconds: number;

   @ApiProperty({
      example: 5,
      description: 'OTP expiration period in minutes',
   })
   expiresInMinutes: number;
}
