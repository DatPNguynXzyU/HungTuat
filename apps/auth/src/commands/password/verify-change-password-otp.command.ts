import { Command, type IDeviceInfo } from '@common';
import type { VerifyChangePasswordOtpDto, VerifyChangePasswordOtpResponseDto } from '@contracts/auth';

export class VerifyChangePasswordOtpCommand extends Command<VerifyChangePasswordOtpResponseDto> {
   constructor(
      public readonly dto: VerifyChangePasswordOtpDto,
      public readonly accountId?: string,
      public readonly userId?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
