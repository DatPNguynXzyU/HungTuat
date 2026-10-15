import { Command, type IDeviceInfo } from '@common';
import type { VerifyRegisterOtpDto, VerifyRegisterOtpResponseDto } from '@contracts/auth';

export class VerifyRegisterOtpCommand extends Command<VerifyRegisterOtpResponseDto> {
   constructor(
      public readonly data: VerifyRegisterOtpDto,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
