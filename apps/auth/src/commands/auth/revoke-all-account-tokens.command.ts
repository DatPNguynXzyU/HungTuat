import { Command, type IDeviceInfo } from '@common';

export class RevokeAllAccountTokensCommand extends Command<{ success: boolean; message: string }> {
   constructor(
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
