import { Command, type IDeviceInfo } from '@common';
import type { IAuthResult, RegisterDto } from '@contracts/auth';

export class RegisterCommand extends Command<IAuthResult> {
   constructor(
      public readonly data: RegisterDto,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
