import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AUTH_RESPONSE_MESSAGES } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { RevokeAllAccountTokensCommand } from '@auth/commands/auth/revoke-all-account-tokens.command';

@Injectable()
@CommandHandler(RevokeAllAccountTokensCommand)
export class RevokeAllAccountTokensHandler implements ICommandHandler<
   RevokeAllAccountTokensCommand,
   { success: boolean; message: string }
> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: RevokeAllAccountTokensCommand): Promise<{ success: boolean; message: string }> {
      const targetId = command.accountId || command.userId || '';
      await this.authCoreService.revokeAllAccountTokens(targetId, command.deviceInfo);
      return { success: true, message: AUTH_RESPONSE_MESSAGES.TOKEN_REVOKE_SUCCESS };
   }
}
