import { Command, type IDeviceInfo } from '@common';
import type { IAuthResult, LoginDto } from '@contracts/auth';

export class LoginCommand extends Command<IAuthResult> {
   constructor(
      public readonly data: LoginDto,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
