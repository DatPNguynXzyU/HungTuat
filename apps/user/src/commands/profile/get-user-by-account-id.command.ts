import { Command } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export class GetUserByAccountIdCommand extends Command<UserEntity> {
   constructor(public readonly accountId: string) {
      super();
   }
}
