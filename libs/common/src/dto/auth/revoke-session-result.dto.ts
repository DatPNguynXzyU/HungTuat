import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevokeSessionResultDto {
   @ApiPropertyOptional({
      description: 'Indicates whether the sessions were successfully revoked',
      example: true,
   })
   success?: boolean;

   @ApiPropertyOptional({
      description: 'Number of active sessions revoked',
      example: 2,
   })
   revokedCount?: number;
}
