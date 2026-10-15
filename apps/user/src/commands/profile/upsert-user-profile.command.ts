import { Command, type IServiceMessage } from '@common';
import type { UserEntity } from '@user/entities';
import type { UpdateUserProfileDto } from '@user/commands/profile/update-user-profile.command';

export class UpsertUserProfileCommand extends Command<UserEntity> {
   constructor(public readonly message: IServiceMessage<UpdateUserProfileDto>) {
      super();
   }
}
