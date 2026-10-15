import { Command } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export class GetUserByUserIdCommand extends Command<UserEntity> {
   constructor(public readonly userId: string) {
      super();
   }
}
