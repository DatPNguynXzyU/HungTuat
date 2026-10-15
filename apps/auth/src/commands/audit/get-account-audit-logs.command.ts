import { Command } from '@common';
import type { IAuditLogListResult } from '@contracts/auth';

export class GetAccountAuditLogsCommand extends Command<IAuditLogListResult> {
   constructor(
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly page?: number,
      public readonly limit?: number,
   ) {
      super();
   }
}
