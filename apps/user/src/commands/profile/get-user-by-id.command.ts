import { Command, type IServiceMessage } from '@common';
import type { UserEntity } from '@user/entities';

export class GetUserByIdCommand extends Command<UserEntity> {
   constructor(public readonly message: IServiceMessage<{ userId: string }>) {
      super();
   }
}
