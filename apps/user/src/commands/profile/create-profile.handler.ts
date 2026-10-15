import { Injectable } from '@nestjs/common';
import { BadRequestException, CommandHandler, type ICommandHandler } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import type { UserEntity } from '@user/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { CreateProfileCommand } from '@user/commands/profile/create-profile.command';
import { UserProfileDataBuilder } from '@user/builders';

@Injectable()
@CommandHandler(CreateProfileCommand)
export class CreateProfileHandler implements ICommandHandler<CreateProfileCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: CreateProfileCommand): Promise<UserEntity> {
      const { message } = command;
      const accountId = message.data?.accountId || message.user?.userId || message.data?.userId;
      if (!accountId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }

      const createUserData = UserProfileDataBuilder.create()
         .fromServiceMessage(message)
         .withAccountId(accountId)
         .build();

      return this.profileService.createUser(createUserData);
   }
}
