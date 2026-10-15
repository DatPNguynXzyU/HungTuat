import { Injectable } from '@nestjs/common';
import { CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { DeleteUserCommand } from '@user/commands/profile/delete-user.command';

@Injectable()
@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: DeleteUserCommand): Promise<UserEntity> {
      const { message } = command;
      const user = await this.profileService.getUserById(message.data.userId);
      if (user) {
         checkOwnershipOrAdmin(message, user.accountId);
      }
      return this.profileService.deleteUser(user.userId);
   }
}
