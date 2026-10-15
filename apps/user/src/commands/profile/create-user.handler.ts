import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { ProfileService } from '@user/services/domain/profile.service';
import { CreateUserCommand } from '@user/commands/profile/create-user.command';
import { UserProfileDataBuilder } from '@user/builders';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, UserEntity> {
   constructor(private readonly profileService: ProfileService) {}

   async execute(command: CreateUserCommand): Promise<UserEntity> {
      const createUserData = UserProfileDataBuilder.create().fromDto(command.data).build();

      return this.profileService.createUser(createUserData);
   }
}
