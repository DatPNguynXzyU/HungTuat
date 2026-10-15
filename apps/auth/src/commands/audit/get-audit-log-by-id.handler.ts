import { Injectable } from '@nestjs/common';
import { CommandHandler, DEFAULT_ROLES, checkRoles, type ICommandHandler } from '@common';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AuditLogService } from '@auth/services/infrastructure';
import { GetAuditLogByIdCommand } from '@auth/commands/audit/get-audit-log-by-id.command';

@Injectable()
@CommandHandler(GetAuditLogByIdCommand)
export class GetAuditLogByIdHandler implements ICommandHandler<GetAuditLogByIdCommand, SecurityAuditLogEntity | null> {
   constructor(private readonly auditLogService: AuditLogService) {}

   async execute(command: GetAuditLogByIdCommand): Promise<SecurityAuditLogEntity | null> {
      checkRoles(command.message, [DEFAULT_ROLES.ADMIN]);
      return this.auditLogService.getAuditLogById(command.message.data.id);
   }
}
