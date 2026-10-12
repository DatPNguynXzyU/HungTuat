import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IAuditLogListResult, IAuditLogQuery } from '@common';
import type { CreateAuditLogData, SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AUDIT_LOG_REPOSITORY, type IAuditLogRepository } from '@auth/repositories/audit-log.repository.interface';

@Injectable()
export class AuditLogService {
   private readonly logger = new Logger(AuditLogService.name);

   constructor(
      @Inject(AUDIT_LOG_REPOSITORY)
      private readonly auditLogRepository: IAuditLogRepository,
   ) {}

   async record(data: CreateAuditLogData): Promise<SecurityAuditLogEntity | null> {
      try {
         return await this.auditLogRepository.createAuditLog(data);
      } catch (error) {
         this.logger.error(
            `Failed to record security audit log for action ${data.action} (actor: ${data.actorEmail || data.accountId || 'unknown'}): ${error instanceof Error ? error.message : String(error)}`,
         );
         return null;
      }
   }

   async getAuditLogs(query: IAuditLogQuery): Promise<IAuditLogListResult> {
      return this.auditLogRepository.findAuditLogs(query);
   }

   async getAuditLogById(id: string): Promise<SecurityAuditLogEntity | null> {
      return this.auditLogRepository.findById(id);
   }

   async getAccountAuditLogs(accountId: string, page = 1, limit = 10): Promise<IAuditLogListResult> {
      return this.auditLogRepository.findAccountAuditLogs(accountId, page, limit);
   }
}
