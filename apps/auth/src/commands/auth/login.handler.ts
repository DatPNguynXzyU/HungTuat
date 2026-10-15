import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IAuthResult } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { LoginCommand } from '@auth/commands/auth/login.command';

@Injectable()
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand, IAuthResult> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: LoginCommand): Promise<IAuthResult> {
      return this.authCoreService.login(command.data, command.deviceInfo);
   }
}
