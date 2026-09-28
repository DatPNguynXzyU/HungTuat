import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { AUDIT_STATUS } from '@common/constants/audit-log.constant';
import type { ICreateAuditLog } from '@common/interfaces/audit-log.interface';

export class CreateAuditLogDto implements ICreateAuditLog {
   @IsOptional()
   @IsString()
   userId?: string | null;

   @IsOptional()
   @IsString()
   actorEmail?: string | null;

   @IsString()
   action: string;

   @IsOptional()
   @IsEnum(AUDIT_STATUS)
   status?: string;

   @IsOptional()
   @IsString()
   ipAddress?: string | null;

   @IsOptional()
   @IsString()
   userAgent?: string | null;

   @IsOptional()
   @IsString()
   deviceType?: string | null;

   @IsOptional()
   @IsString()
   deviceName?: string | null;

   @IsOptional()
   @IsString()
   browser?: string | null;

   @IsOptional()
   @IsString()
   os?: string | null;

   @IsOptional()
   @IsString()
   city?: string | null;

   @IsOptional()
   @IsString()
   country?: string | null;

   @IsOptional()
   @IsString()
   reason?: string | null;

   @IsOptional()
   @IsObject()
   metadata?: Record<string, unknown> | null;
}
