import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SendRegisterOtpResponseDto } from '@contracts/auth';
import { AuthRegistrationService } from '@auth/services/domain';
import { SendRegisterOtpCommand } from '@auth/commands/registration/send-register-otp.command';

@Injectable()
@CommandHandler(SendRegisterOtpCommand)
export class SendRegisterOtpHandler implements ICommandHandler<SendRegisterOtpCommand, SendRegisterOtpResponseDto> {
   constructor(private readonly authRegistrationService: AuthRegistrationService) {}

   async execute(command: SendRegisterOtpCommand): Promise<SendRegisterOtpResponseDto> {
      return this.authRegistrationService.sendRegisterOtp(command.data, command.deviceInfo);
   }
}
