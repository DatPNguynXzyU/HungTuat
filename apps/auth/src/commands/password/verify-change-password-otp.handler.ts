import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { VerifyChangePasswordOtpResponseDto } from '@contracts/auth';
import { PasswordManagementService } from '@auth/services/domain';
import { VerifyChangePasswordOtpCommand } from '@auth/commands/password/verify-change-password-otp.command';

@Injectable()
@CommandHandler(VerifyChangePasswordOtpCommand)
export class VerifyChangePasswordOtpHandler implements ICommandHandler<
   VerifyChangePasswordOtpCommand,
   VerifyChangePasswordOtpResponseDto
> {
   constructor(private readonly passwordManagementService: PasswordManagementService) {}

   async execute(command: VerifyChangePasswordOtpCommand): Promise<VerifyChangePasswordOtpResponseDto> {
      const targetId = command.accountId || command.userId || '';
      return this.passwordManagementService.verifyChangePasswordOtp(targetId, command.dto, command.deviceInfo);
   }
}
