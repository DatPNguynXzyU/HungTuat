import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { AuthService } from '@user/services/domain/auth.service';
import { HandleUserRegisteredCommand } from '@user/commands/authentication/handle-user-registered.command';

@Injectable()
@CommandHandler(HandleUserRegisteredCommand)
export class HandleUserRegisteredHandler implements ICommandHandler<HandleUserRegisteredCommand, UserEntity | null> {
   constructor(private readonly authService: AuthService) {}

   async execute(command: HandleUserRegisteredCommand): Promise<UserEntity | null> {
      return this.authService.handleUserRegistered(command.data);
   }
}
