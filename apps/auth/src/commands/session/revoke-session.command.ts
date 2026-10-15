import { Command, type IDeviceInfo } from '@common';

export class RevokeSessionCommand extends Command<{ success: boolean }> {
   constructor(
      public readonly sessionId: string,
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
