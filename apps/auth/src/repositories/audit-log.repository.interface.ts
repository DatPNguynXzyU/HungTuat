import type { SecurityAuditLogEntity, CreateAuditLogData } from '@auth/entities/audit-log.entity';
import type { IAuditLogQuery, IAuditLogListResult } from '@common';

export const AUDIT_LOG_REPOSITORY = 'AUDIT_LOG_REPOSITORY';

export interface IAuditLogRepository {
   createAuditLog(data: CreateAuditLogData): Promise<SecurityAuditLogEntity>;
   findAuditLogs(query: IAuditLogQuery): Promise<IAuditLogListResult>;
   findById(id: string): Promise<SecurityAuditLogEntity | null>;
   findUserAuditLogs(userId: string, page?: number, limit?: number): Promise<IAuditLogListResult>;
}
