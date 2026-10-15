import { Command } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export class RestoreUserCommand extends Command<UserEntity> {
   constructor(public readonly userId: string) {
      super();
   }
}
