import { Command, type IDeviceInfo } from '@common';
import type { IAuthResult } from '@contracts/auth';

export class RefreshTokenCommand extends Command<IAuthResult> {
   constructor(
      public readonly refreshToken: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
