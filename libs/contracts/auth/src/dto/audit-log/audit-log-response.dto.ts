import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ISecurityAuditLog } from '@contracts/auth/interfaces/audit-log.interface';

export class AuditLogResponseDto implements ISecurityAuditLog {
   @ApiProperty({ example: '018dc3bc-11a2-7f28-9842-bc08684d0001', description: 'Unique audit log entry UUID' })
   id: string;

   @ApiPropertyOptional({
      example: '018dc3bc-11a2-7f28-9842-bc08684d0000',
      description: 'User ID associated with the event',
   })
   userId?: string | null;

   @ApiPropertyOptional({ example: 'user@example.com', description: 'Actor email address' })
   actorEmail?: string | null;

   @ApiProperty({ example: 'AUTH.LOGIN_SUCCESS', description: 'Security event action code' })
   action: string;

   @ApiProperty({ example: 'SUCCESS', enum: ['SUCCESS', 'FAILURE'], description: 'Outcome status' })
   status: string;

   @ApiPropertyOptional({ example: '192.168.1.1', description: 'Client IP address' })
   ipAddress?: string | null;

   @ApiPropertyOptional({ example: 'Mozilla/5.0 ...', description: 'Raw User-Agent string' })
   userAgent?: string | null;

   @ApiPropertyOptional({ example: 'Desktop', description: 'Device type (Desktop, Mobile, Tablet, etc.)' })
   deviceType?: string | null;

   @ApiPropertyOptional({ example: 'Macintosh', description: 'Device name/model' })
   deviceName?: string | null;

   @ApiPropertyOptional({ example: 'Chrome', description: 'Browser name' })
   browser?: string | null;

   @ApiPropertyOptional({ example: 'macOS', description: 'Operating system' })
   os?: string | null;

   @ApiPropertyOptional({ example: 'Ho Chi Minh City', description: 'Geo-located City' })
   city?: string | null;

   @ApiPropertyOptional({ example: 'Vietnam', description: 'Geo-located Country' })
   country?: string | null;

   @ApiPropertyOptional({ example: 'Invalid credentials provided', description: 'Failure reason or context' })
   reason?: string | null;

   @ApiPropertyOptional({ example: { sessionId: '018dc3bc...' }, description: 'Sanitized context metadata' })
   metadata?: Record<string, unknown> | null;

   @ApiProperty({ example: '2026-09-28T09:00:00.000Z', description: 'Timestamp when event occurred' })
   createdAt: string;
}
