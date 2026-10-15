import { Command, type IDeviceInfo } from '@common';
import type { IRevokeSessionResult } from '@contracts/auth';

export class RevokeOtherSessionsCommand extends Command<IRevokeSessionResult> {
   constructor(
      public readonly currentJti: string,
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
