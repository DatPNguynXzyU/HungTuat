import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UserEmailResponseDto {
   @ApiProperty({
      description: 'Account unique identifier (UUIDv7)',
      example: '018dc3bc-11a2-7f28-9842-bc08684d0001',
      format: 'uuid',
   })
   @IsString()
   @IsUUID()
   @IsNotEmpty()
   id!: string;

   @ApiProperty({
      description: 'Account registered email address',
      example: 'alex.rivera@example.com',
      format: 'email',
   })
   @IsString()
   @IsEmail()
   @IsNotEmpty()
   email!: string;

   @ApiProperty({
      description: 'Verification status indicating whether the email has been confirmed via OTP',
      example: true,
   })
   @IsBoolean()
   isEmailVerified!: boolean;
}
