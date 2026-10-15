import { Command, type IServiceMessage } from '@common';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';

export class GetAuditLogByIdCommand extends Command<SecurityAuditLogEntity | null> {
   constructor(public readonly message: IServiceMessage<{ id: string }>) {
      super();
   }
}
