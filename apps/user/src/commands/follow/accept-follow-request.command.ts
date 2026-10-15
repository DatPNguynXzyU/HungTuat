import { Command } from '@common';
import type { FollowEntity } from '@user/entities';

export class AcceptFollowRequestCommand extends Command<FollowEntity> {
   constructor(public readonly followId: string) {
      super();
   }
}
