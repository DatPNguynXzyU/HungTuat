import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AuditLogService } from '@auth/services/infrastructure';
import { CreateAuditLogCommand } from '@auth/commands/audit/create-audit-log.command';

@Injectable()
@CommandHandler(CreateAuditLogCommand)
export class CreateAuditLogHandler implements ICommandHandler<CreateAuditLogCommand, SecurityAuditLogEntity | null> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: CreateAuditLogCommand): Promise<SecurityAuditLogEntity | null> {
      return this.auditLogService.record(command.data);
   }
}
