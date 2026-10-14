import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthProfileResponseDto {
   @ApiProperty({
      description: 'Account subject UUID identifier',
      example: '018dc3bc-11a2-7f28-9842-bc08684d0001',
   })
   sub!: string;

   @ApiProperty({
      description: 'Account registered email address',
      example: 'user@example.com',
   })
   email!: string;

   @ApiPropertyOptional({
      description: 'Roles assigned to the authenticated account',
      example: ['user'],
      type: [String],
   })
   roles?: string[];

   @ApiPropertyOptional({
      description: 'Token type (e.g. access)',
      example: 'access',
   })
   tokenType?: string;

   @ApiPropertyOptional({
      description: 'JWT identifier (Session / token ID)',
      example: '550e8400-e29b-41d4-a716-446655440000',
   })
   jti?: string;

   @ApiPropertyOptional({
      description: 'Issued-at timestamp in seconds',
      example: 1712839200,
   })
   iat?: number;

   @ApiPropertyOptional({
      description: 'Expiration timestamp in seconds',
      example: 1712840100,
   })
   exp?: number;
}
