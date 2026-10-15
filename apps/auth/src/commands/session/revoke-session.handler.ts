import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { SessionManagementService } from '@auth/services/domain';
import { RevokeSessionCommand } from '@auth/commands/session/revoke-session.command';

@Injectable()
@CommandHandler(RevokeSessionCommand)
export class RevokeSessionHandler implements ICommandHandler<RevokeSessionCommand, { success: boolean }> {
   constructor(private readonly sessionManagementService: SessionManagementService) {}

   async execute(command: RevokeSessionCommand): Promise<{ success: boolean }> {
      const targetId = command.accountId || command.userId || '';
      await this.sessionManagementService.revokeSession(targetId, command.sessionId, command.deviceInfo);
      return { success: true };
   }
}
