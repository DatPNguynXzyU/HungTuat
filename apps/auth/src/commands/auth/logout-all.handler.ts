import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AUTH_RESPONSE_MESSAGES } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { LogoutAllCommand } from '@auth/commands/auth/logout-all.command';

@Injectable()
@CommandHandler(LogoutAllCommand)
export class LogoutAllHandler implements ICommandHandler<LogoutAllCommand, { success: boolean; message: string }> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: LogoutAllCommand): Promise<{ success: boolean; message: string }> {
      const targetId = command.accountId || command.userId || '';
      await this.authCoreService.logoutAll(targetId, command.deviceInfo);
      return { success: true, message: AUTH_RESPONSE_MESSAGES.LOGOUT_ALL_SUCCESS };
   }
}
