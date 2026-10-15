import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IAuditLogListResult } from '@contracts/auth';
import { AuditLogService } from '@auth/services/infrastructure';
import { GetAccountAuditLogsCommand } from '@auth/commands/audit/get-account-audit-logs.command';

@Injectable()
@CommandHandler(GetAccountAuditLogsCommand)
export class GetAccountAuditLogsHandler implements ICommandHandler<GetAccountAuditLogsCommand, IAuditLogListResult> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: GetAccountAuditLogsCommand): Promise<IAuditLogListResult> {
      const targetId = command.accountId || command.userId || '';
      return this.auditLogService.getAccountAuditLogs(targetId, command.page, command.limit);
   }
}
