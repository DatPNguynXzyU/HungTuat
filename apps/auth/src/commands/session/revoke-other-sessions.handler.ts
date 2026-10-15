import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IRevokeSessionResult } from '@contracts/auth';
import { SessionManagementService } from '@auth/services/domain';
import { RevokeOtherSessionsCommand } from '@auth/commands/session/revoke-other-sessions.command';

@Injectable()
@CommandHandler(RevokeOtherSessionsCommand)
export class RevokeOtherSessionsHandler implements ICommandHandler<RevokeOtherSessionsCommand, IRevokeSessionResult> {
   constructor(private readonly sessionManagementService: SessionManagementService) {}

   async execute(command: RevokeOtherSessionsCommand): Promise<IRevokeSessionResult> {
      const targetId = command.accountId || command.userId || '';
      return this.sessionManagementService.revokeOtherSessions(targetId, command.currentJti, command.deviceInfo);
   }
}
