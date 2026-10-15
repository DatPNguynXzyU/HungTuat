import { Command } from '@common';
import type { UserEntity } from '@user/entities';

export class GetUserByAccountIdCommand extends Command<UserEntity> {
   constructor(public readonly accountId: string) {
      super();
   }
}
