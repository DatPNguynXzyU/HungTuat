import { Command } from '@common';
import type { FollowEntity } from '@user/entities';

export class RejectFollowRequestCommand extends Command<FollowEntity> {
   constructor(public readonly followId: string) {
      super();
   }
}
