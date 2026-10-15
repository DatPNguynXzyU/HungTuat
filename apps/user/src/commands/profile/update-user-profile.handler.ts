import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { UpdateUserProfileCommand } from '@user/commands/profile/update-user-profile.command';
import { UserProfileDataBuilder } from '@user/builders';

@Injectable()
@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler implements ICommandHandler<UpdateUserProfileCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: UpdateUserProfileCommand): Promise<UserEntity> {
      const { message } = command;
      const { userId } = message.data;
      if (!userId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }

      const existingUser = await this.profileService.getUserById(userId);
      checkOwnershipOrAdmin(message, existingUser.accountId);

      const updateData = UserProfileDataBuilder.create().fromDto(message.data).buildUpdate();

      return this.profileService.updateUserProfile(userId, updateData);
   }
}
