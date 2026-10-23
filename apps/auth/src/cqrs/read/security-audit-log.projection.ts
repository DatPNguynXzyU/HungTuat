import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_CQRS_EVENTS } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { CreateAuditLogData, SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AUDIT_LOG_REPOSITORY, type IAuditLogRepository } from '@auth/repositories/audit-log.repository.interface';

@Injectable()
export class SecurityAuditLogProjection {
   private readonly logger = new Logger(SecurityAuditLogProjection.name);

   constructor(
      @Inject(AUDIT_LOG_REPOSITORY)
      private readonly auditLogRepository: IAuditLogRepository,
   ) {}

   @OnEvent(AUDIT_CQRS_EVENTS.EVENT_APPENDED)
   async project(event: CreateAuditLogData): Promise<SecurityAuditLogEntity | null> {
      try {
         const result = await this.auditLogRepository.createAuditLog(event);
         this.logger.debug?.(
            `Security audit log projected successfully for ${event.action} (${event.auditLogId || 'new'})`,
         );
         return result;
      } catch (error: unknown) {
         const err = error as Error;
         this.logger.error(
            `Failed to project security audit log for action ${event.action}: ${err.message}`,
            err.stack,
         );
         return null;
      }
   }
}
