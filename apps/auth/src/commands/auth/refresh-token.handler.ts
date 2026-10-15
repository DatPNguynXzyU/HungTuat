import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IAuthResult } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { RefreshTokenCommand } from '@auth/commands/auth/refresh-token.command';

@Injectable()
@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand, IAuthResult> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: RefreshTokenCommand): Promise<IAuthResult> {
      return this.authCoreService.refreshToken(command.refreshToken, command.deviceInfo);
   }
}
