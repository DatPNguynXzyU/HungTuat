import { Injectable } from '@nestjs/common';
import { CommandHandler, checkPermissions, isActorAdmin, type ICommandHandler } from '@common';
import { AUTH_PERMISSIONS, type IAuditLogListResult } from '@contracts/auth';
import { AuditLogService } from '@auth/services/infrastructure';
import { GetAuditLogsCommand } from '@auth/commands/audit/get-audit-logs.command';

@Injectable()
@CommandHandler(GetAuditLogsCommand)
export class GetAuditLogsHandler implements ICommandHandler<GetAuditLogsCommand, IAuditLogListResult> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: GetAuditLogsCommand): Promise<IAuditLogListResult> {
      if (!isActorAdmin(command.message)) {
         checkPermissions(command.message, [AUTH_PERMISSIONS.AUDIT_LOGS_READ]);
      }
      return this.auditLogService.getAuditLogs(command.message.data);
   }
}
