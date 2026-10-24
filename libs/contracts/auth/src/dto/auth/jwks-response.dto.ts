import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JsonWebKeyDto {
   @ApiProperty({
      description: 'Key type parameter indicating cryptographic family (e.g. EC or RSA)',
      example: 'EC',
      enum: ['EC', 'RSA'],
   })
   kty!: string;

   @ApiPropertyOptional({
      description: 'Public key use parameter (e.g. sig for signature verification)',
      example: 'sig',
   })
   use?: string;

   @ApiPropertyOptional({
      description: 'Intended algorithm family for key usage (e.g. ES256, RS256)',
      example: 'ES256',
   })
   alg?: string;

   @ApiPropertyOptional({
      description: 'Key ID identifier matching the JWT header kid',
      example: 'omni-auth-key-1',
   })
   kid?: string;

   @ApiPropertyOptional({
      description: 'Cryptographic curve for EC keys (e.g. P-256)',
      example: 'P-256',
   })
   crv?: string;

   @ApiPropertyOptional({
      description: 'EC public key X-coordinate (base64url-encoded)',
      example: 'dkg5oASN9Iw6CsHZNlaEp-Lytun-Jsb4sBiu3hlPgmE',
   })
   x?: string;

   @ApiPropertyOptional({
      description: 'EC public key Y-coordinate (base64url-encoded)',
      example: 'w8wvljnMoJW9o1wkzkEDJheBHKqP_qyn28abzTL2yIc',
   })
   y?: string;

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
