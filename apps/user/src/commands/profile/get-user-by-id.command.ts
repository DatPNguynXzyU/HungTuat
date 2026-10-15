import { Command, type IServiceMessage } from '@common';
import type { UserEntity } from '@user/core/database/entities';

export class GetUserByIdCommand extends Command<UserEntity> {
   constructor(public readonly message: IServiceMessage<{ userId: string }>) {
      super();
   }
}
