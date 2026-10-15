import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { VerifyRegisterOtpResponseDto } from '@contracts/auth';
import { AuthRegistrationService } from '@auth/services/domain';
import { VerifyRegisterOtpCommand } from '@auth/commands/registration/verify-register-otp.command';

@Injectable()
@CommandHandler(VerifyRegisterOtpCommand)
export class VerifyRegisterOtpHandler implements ICommandHandler<
   VerifyRegisterOtpCommand,
   VerifyRegisterOtpResponseDto
> {
   constructor(private readonly authRegistrationService: AuthRegistrationService) {}

   async execute(command: VerifyRegisterOtpCommand): Promise<VerifyRegisterOtpResponseDto> {
      return this.authRegistrationService.verifyRegisterOtp(command.data, command.deviceInfo);
   }
}
