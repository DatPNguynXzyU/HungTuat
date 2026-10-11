import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JsonWebKeyDto {
   @ApiProperty({
      description: 'Key type parameter (e.g. RSA)',
      example: 'RSA',
   })
   kty!: string;

   @ApiPropertyOptional({
      description: 'Public key use parameter (e.g. sig for signature verification)',
      example: 'sig',
   })
   use?: string;

   @ApiPropertyOptional({
      description: 'Intended algorithm family',
      example: 'RS256',
   })
   alg?: string;

   @ApiPropertyOptional({
      description: 'Key ID identifier matching the JWT header kid',
      example: 'omni-jwt-key-2026',
   })
   kid?: string;

   @ApiPropertyOptional({
      description: 'RSA modulus (base64url-encoded)',
      example: 'u1II2qmJ842d...',
   })
   n?: string;

   @ApiPropertyOptional({
      description: 'RSA exponent (base64url-encoded)',
      example: 'AQAB',
   })
   e?: string;
}

export class JwksResponseDto {
   @ApiProperty({
      description: 'Array of JSON Web Key (JWK) public keys',
      type: [JsonWebKeyDto],
   })
   keys!: JsonWebKeyDto[];
}
