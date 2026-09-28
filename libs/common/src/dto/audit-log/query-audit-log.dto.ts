import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AUDIT_STATUS } from '@common/constants/audit-log.constant';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

export class QueryAuditLogDto extends PaginationQueryDto {
   @ApiPropertyOptional({ description: 'Filter by user ID' })
   @IsOptional()
   @IsString()
   userId?: string;

   @ApiPropertyOptional({ description: 'Filter by actor email' })
   @IsOptional()
   @IsString()
   actorEmail?: string;

   @ApiPropertyOptional({ description: 'Filter by audit action (e.g., AUTH.LOGIN_SUCCESS)' })
   @IsOptional()
   @IsString()
   action?: string;

   @ApiPropertyOptional({ description: 'Filter by status', enum: AUDIT_STATUS })
   @IsOptional()
   @IsEnum(AUDIT_STATUS)
   status?: string;

   @ApiPropertyOptional({ description: 'Start date filter (ISO format, e.g. 2026-01-01T00:00:00.000Z)' })
   @IsOptional()
   @IsDateString()
   startDate?: string;

   @ApiPropertyOptional({ description: 'End date filter (ISO format, e.g. 2026-12-31T23:59:59.999Z)' })
   @IsOptional()
   @IsDateString()
   endDate?: string;
}
