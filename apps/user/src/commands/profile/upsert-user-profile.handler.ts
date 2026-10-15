import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import type { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { UpsertUserProfileCommand } from '@user/commands/profile/upsert-user-profile.command';
import { UserProfileDataBuilder } from '@user/builders';

@Injectable()
@CommandHandler(UpsertUserProfileCommand)
export class UpsertUserProfileHandler implements ICommandHandler<UpsertUserProfileCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: UpsertUserProfileCommand): Promise<UserEntity> {
      const { message } = command;
      const { userId } = message.data;
      if (!userId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }

      let targetOwnerId = userId;
      try {
         const existingUser = await this.profileService.getUserById(userId);
         if (existingUser) {
            targetOwnerId = existingUser.accountId;
         }
      } catch {
         // User does not exist in DB yet, fallback to comparing userId with message.user.userId
      }

      checkOwnershipOrAdmin(message, targetOwnerId);

      const updateData = UserProfileDataBuilder.create().fromDto(message.data).buildUpdate();

      return this.profileService.upsertUserProfile(userId, updateData);
   }
}
