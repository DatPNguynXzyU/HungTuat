import { Command, type IDeviceInfo } from '@common';

export class RevokeTokenCommand extends Command<{ success: boolean }> {
   constructor(
      public readonly token: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
