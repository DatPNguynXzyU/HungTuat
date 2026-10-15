import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthService } from '@user/services/domain/auth.service';
import { CheckUsernameCommand } from '@user/commands/authentication/check-username.command';

@Injectable()
@CommandHandler(CheckUsernameCommand)
export class CheckUsernameHandler implements ICommandHandler<
   CheckUsernameCommand,
   { available: boolean; username: string }
> {
   constructor(private readonly authService: AuthService) {}

   async execute(command: CheckUsernameCommand): Promise<{ available: boolean; username: string }> {
      return this.authService.checkUsername(command.username);
   }
}
