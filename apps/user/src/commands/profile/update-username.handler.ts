import { Injectable } from '@nestjs/common';
import { CommandHandler, checkOwnershipOrAdmin, isActorAdmin, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { UpdateUsernameCommand } from '@user/commands/profile/update-username.command';

@Injectable()
@CommandHandler(UpdateUsernameCommand)
export class UpdateUsernameHandler implements ICommandHandler<UpdateUsernameCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: UpdateUsernameCommand): Promise<UserEntity> {
      const { message } = command;
      const user = await this.profileService.getUserById(message.data.userId);
      if (user) {
         checkOwnershipOrAdmin(message, user.accountId);
      }
      const isAdmin = isActorAdmin(message);
      return this.profileService.updateUsername(user.userId, message.data.username, { isActorAdmin: isAdmin });
   }
}
