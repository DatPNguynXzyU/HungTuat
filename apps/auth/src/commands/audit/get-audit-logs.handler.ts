import { Injectable } from '@nestjs/common';
import { CommandHandler, DEFAULT_ROLES, checkRoles, type ICommandHandler } from '@common';
import type { IAuditLogListResult } from '@contracts/auth';
import { AuditLogService } from '@auth/services/infrastructure';
import { GetAuditLogsCommand } from '@auth/commands/audit/get-audit-logs.command';

@Injectable()
@CommandHandler(GetAuditLogsCommand)
export class GetAuditLogsHandler implements ICommandHandler<GetAuditLogsCommand, IAuditLogListResult> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: GetAuditLogsCommand): Promise<IAuditLogListResult> {
      checkRoles(command.message, [DEFAULT_ROLES.ADMIN]);
      return this.auditLogService.getAuditLogs(command.message.data);
   }
}
