import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { DeviceSessionResponseDto } from '@contracts/auth';
import { SessionManagementService } from '@auth/services/domain';
import { GetSessionsCommand } from '@auth/commands/session/get-sessions.command';

@Injectable()
@CommandHandler(GetSessionsCommand)
export class GetSessionsHandler implements ICommandHandler<GetSessionsCommand, DeviceSessionResponseDto[]> {
   constructor(private readonly sessionManagementService: SessionManagementService) {}

   async execute(command: GetSessionsCommand): Promise<DeviceSessionResponseDto[]> {
      const targetId = command.accountId || command.userId || '';
      return this.sessionManagementService.getSessions(targetId, command.currentJti);
   }
}
