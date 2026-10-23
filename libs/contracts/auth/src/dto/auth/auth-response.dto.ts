import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, ValidateNested, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class AuthTokensDto {
   @ApiProperty({
      description: 'JWT access token for API authentication',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
   })
   @IsString()
   accessToken!: string;

   @ApiProperty({
      description: 'JWT refresh token for token rotation',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
   })
   @IsString()
   refreshToken!: string;

   @ApiProperty({
      description: 'Token type',
      example: 'Bearer',
      enum: ['Bearer'],
   })
   @IsString()
   tokenType!: 'Bearer';

   @ApiProperty({
      description: 'Access token expiration time in seconds',
      example: 900,
   })
   @IsNumber()
   expiresIn!: number;
}

export class AuthUserDto {
   @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
   @IsString()
   @IsUUID()
   userId!: string;

   @ApiProperty({ description: 'User email', example: 'user@example.com' })
   @IsString()
   email!: string;

   @ApiProperty({ description: 'User roles', example: ['user'], type: [String] })
   roles!: string[];

   @ApiProperty({ description: 'User status', example: 'active', required: false })
   status?: string;
}

export class AuthResponseDto {
   @ApiProperty({
      description: 'Authenticated user information',
      type: AuthUserDto,
   })
   @IsObject()
   @ValidateNested()
   @Type(() => AuthUserDto)
   user!: AuthUserDto;

   @ApiProperty({
      description: 'Authentication tokens (for mobile/API clients). Web browsers should use HttpOnly cookies instead.',
      type: AuthTokensDto,
   })
   @IsObject()
   @ValidateNested()
   @Type(() => AuthTokensDto)
   tokens!: AuthTokensDto;
}

export class RefreshTokenRequestDto {
   @ApiProperty({
      description: 'Refresh token (optional if provided via cookie or X-Refresh-Token header)',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: false,
   })
   @IsOptional()
   @IsString()
   refreshToken?: string;
}

export class RevokeTokenRequestDto {
   @ApiProperty({
      description: 'Token to revoke (optional if provided via cookie or Authorization header)',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      required: false,
   })
   @IsOptional()
   @IsString()
   token?: string;
}
