import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthCoreService } from '@auth/services/domain';
import { RevokeTokenCommand } from '@auth/commands/auth/revoke-token.command';

@Injectable()
@CommandHandler(RevokeTokenCommand)
export class RevokeTokenHandler implements ICommandHandler<RevokeTokenCommand, { success: boolean }> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: RevokeTokenCommand): Promise<{ success: boolean }> {
      await this.authCoreService.revokeToken(command.token, command.deviceInfo);
      return { success: true };
   }
}
