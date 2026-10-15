import { Command } from '@common';
import type { UserEntity } from '@user/entities';

export class GetUserByUsernameCommand extends Command<UserEntity> {
   constructor(public readonly username: string) {
      super();
   }
}
