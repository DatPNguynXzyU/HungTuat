import { Command } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export class GetUserByUsernameCommand extends Command<UserEntity> {
   constructor(public readonly username: string) {
      super();
   }
}
