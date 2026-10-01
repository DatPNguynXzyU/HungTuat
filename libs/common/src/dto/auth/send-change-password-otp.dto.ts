import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordResponseDto {
   @ApiProperty({
      example: true,
      description: 'Indicates whether the password change OTP was initiated successfully',
   })
   success: boolean;

   @ApiProperty({
      example: 'AUTH.SEND_CHANGE_PASSWORD_OTP_SUCCESS',
      description: 'Response message key',
   })
   message: string;

   @ApiProperty({
      example: 60,
      description: 'Cooldown period in seconds before user can request another OTP',
   })
   cooldownSeconds: number;

   @ApiProperty({
      example: 10,
      description: 'OTP expiration period in minutes',
   })
   expiresInMinutes: number;
}

export type SendChangePasswordOtpResponseDto = ChangePasswordResponseDto;
export const SendChangePasswordOtpResponseDto = ChangePasswordResponseDto;
