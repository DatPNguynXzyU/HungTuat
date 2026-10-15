import { Command, type IDeviceInfo } from '@common';
import type { SendRegisterOtpDto, SendRegisterOtpResponseDto } from '@contracts/auth';

export class SendRegisterOtpCommand extends Command<SendRegisterOtpResponseDto> {
   constructor(
      public readonly data: SendRegisterOtpDto,
      public readonly deviceInfo?: IDeviceInfo,
   ) {
      super();
   }
}
