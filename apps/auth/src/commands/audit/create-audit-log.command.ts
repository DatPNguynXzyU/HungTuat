import { Command } from '@common';
import type { CreateAuditLogDto } from '@contracts/auth';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';

export class CreateAuditLogCommand extends Command<SecurityAuditLogEntity | null> {
   constructor(public readonly data: CreateAuditLogDto) {
      super();
   }
}
