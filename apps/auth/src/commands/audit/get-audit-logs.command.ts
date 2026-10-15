import { Command, type IServiceMessage } from '@common';
import type { IAuditLogListResult, QueryAuditLogDto } from '@contracts/auth';

export class GetAuditLogsCommand extends Command<IAuditLogListResult> {
   constructor(public readonly message: IServiceMessage<QueryAuditLogDto>) {
      super();
   }
}
