import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { RestoreUserCommand } from '@user/commands/profile/restore-user.command';

@Injectable()
@CommandHandler(RestoreUserCommand)
export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: RestoreUserCommand): Promise<UserEntity> {
      return this.profileService.restoreUser(command.userId);
   }
}
