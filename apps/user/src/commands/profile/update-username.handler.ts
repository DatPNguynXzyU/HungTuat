import { Injectable } from '@nestjs/common';
import { CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
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
      return this.profileService.updateUsername(user.userId, message.data.username);
   }
}
