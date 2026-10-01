import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
   @ApiPropertyOptional({
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      description: 'Refresh token (required for mobile/API clients, optional for web with cookies)',
   })
   @IsOptional()
   @IsString()
   refreshToken?: string;

   @ApiPropertyOptional({
      example: 'device-uuid-12345',
      description: 'Device identifier for session validation',
   })
   @IsOptional()
   @IsString()
   deviceId?: string;
}
