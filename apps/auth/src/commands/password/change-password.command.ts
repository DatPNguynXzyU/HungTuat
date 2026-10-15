import { Command, type IDeviceInfo } from '@common';
import type { ChangePasswordDto, ChangePasswordResponseDto } from '@contracts/auth';

export class ChangePasswordCommand extends Command<ChangePasswordResponseDto> {
   constructor(
      public readonly dto: ChangePasswordDto,
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
