import { Command } from '@common';
import type { UserEntity } from '@user/entities';

export class GetUserByUserIdCommand extends Command<UserEntity> {
   constructor(public readonly userId: string) {
      super();
   }
}
