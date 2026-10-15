import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { ChangePasswordResponseDto } from '@contracts/auth';
import { PasswordManagementService } from '@auth/services/domain';
import { ChangePasswordCommand } from '@auth/commands/password/change-password.command';

@Injectable()
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, ChangePasswordResponseDto> {
   constructor(private readonly passwordManagementService: PasswordManagementService) {}

   async execute(command: ChangePasswordCommand): Promise<ChangePasswordResponseDto> {
      const targetId = command.accountId || command.userId || '';
      return this.passwordManagementService.changePassword(targetId, command.dto, command.deviceInfo);
   }
}
