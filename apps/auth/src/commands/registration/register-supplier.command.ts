import { Command, type IDeviceInfo } from '@common';
import type { IAuthResult, RegisterSupplierAccountDto } from '@contracts/auth';

export class RegisterSupplierCommand extends Command<IAuthResult> {
   constructor(
      public readonly data: RegisterSupplierAccountDto,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
