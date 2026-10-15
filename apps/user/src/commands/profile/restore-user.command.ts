import { Command } from '@common';
import type { UserEntity } from '@user/entities';

export class RestoreUserCommand extends Command<UserEntity> {
   constructor(public readonly userId: string) {
      super();
   }
}
