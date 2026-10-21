import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength, IsOptional, IsEnum } from 'class-validator';
import { CLIENT_TYPES, type ClientType, Match } from '@common';

export class RegisterSupplierAccountDto {
   @ApiProperty({
      example: 'supplier.admin@example.com',
      description: 'Supplier admin email address used for credentials and notifications',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   email: string;

   @ApiProperty({
      example: 'P@ssword123!',
      description: 'Supplier account password (min 6 characters)',
   })
   @IsString({ message: 'Password must be a string' })
   @MinLength(6, { message: 'Password must be at least 6 characters long' })
   @MaxLength(100, { message: 'Password must not exceed 100 characters' })
   password: string;

   @ApiProperty({
      example: 'P@ssword123!',
      description: 'Confirm supplier password (must match password)',
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
      description: 'Unique device identifier for client tracking',
   })
   @IsOptional()
   @IsString()
   deviceId?: string;

   @ApiPropertyOptional({
      example: CLIENT_TYPES.WEB,
      description: 'Client platform type',
      enum: Object.values(CLIENT_TYPES),
   })
   @IsOptional()
   @IsEnum(CLIENT_TYPES)
   clientType?: ClientType;

   @ApiPropertyOptional({
      example: '1.0.0',
      description: 'Application version for client telemetry',
   })
   @IsOptional()
   @IsString()
   appVersion?: string;
}
