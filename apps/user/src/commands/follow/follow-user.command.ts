import { Command, type IServiceMessage } from '@common';
import type { FollowEntity } from '@user/core/database/entities';

export class FollowUserCommand extends Command<FollowEntity> {
   constructor(public readonly message: IServiceMessage<{ followerId: string; followingId: string }>) {
      super();
   }
}
