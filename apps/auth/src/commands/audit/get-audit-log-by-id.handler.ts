import { Injectable } from '@nestjs/common';
import { CommandHandler, checkPermissions, isActorAdmin, type ICommandHandler } from '@common';
import { AUTH_PERMISSIONS } from '@contracts/auth';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AuditLogService } from '@auth/services/infrastructure';
import { GetAuditLogByIdCommand } from '@auth/commands/audit/get-audit-log-by-id.command';

@Injectable()
@CommandHandler(GetAuditLogByIdCommand)
export class GetAuditLogByIdHandler implements ICommandHandler<GetAuditLogByIdCommand, SecurityAuditLogEntity | null> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: GetAuditLogByIdCommand): Promise<SecurityAuditLogEntity | null> {
      if (!isActorAdmin(command.message)) {
         checkPermissions(command.message, [AUTH_PERMISSIONS.AUDIT_LOGS_READ]);
      }
      return this.auditLogService.getAuditLogById(command.message.data.id);
   }
}
