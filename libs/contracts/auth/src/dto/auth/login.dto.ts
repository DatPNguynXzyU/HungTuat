import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { CLIENT_TYPES, type ClientType } from '@common';

export class LoginDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address',
   })
   @IsEmail()
   @IsNotEmpty()
   email: string;

   @ApiProperty({ example: 'password123', description: 'User password' })
   @IsString()
   @IsNotEmpty()
   password: string;

   @ApiPropertyOptional({ example: '127.0.0.1', description: 'Client IP address' })
   @IsOptional()
   @IsString()
   ip?: string;

   @ApiPropertyOptional({
      example: 'device-uuid-12345',
      description: 'Unique device identifier for mobile/desktop clients',
   })
   @IsOptional()
   @IsString()
   deviceId?: string;

   @ApiPropertyOptional({
      example: CLIENT_TYPES.MOBILE,
      description: 'Client type',
      enum: Object.values(CLIENT_TYPES),
   })
   @IsOptional()
   @IsEnum(CLIENT_TYPES)
   clientType?: ClientType;

   @ApiPropertyOptional({
      example: '1.0.0',
      description: 'Application version for mobile/desktop clients',
   })
   @IsOptional()
   @IsString()
   appVersion?: string;
}
