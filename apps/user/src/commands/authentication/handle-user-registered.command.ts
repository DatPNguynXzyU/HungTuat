import { Command } from '@common';
import type { UserEntity } from '@user/entities';

export class HandleUserRegisteredCommand extends Command<UserEntity | null> {
   constructor(public readonly data: { accountId: string; email?: string }) {
      super();
   }
}
