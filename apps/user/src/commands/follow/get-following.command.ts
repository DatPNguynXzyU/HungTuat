import { Command } from '@common';
import type { FollowEntity, FollowStatus } from '@user/entities';

export class GetFollowingCommand extends Command<FollowEntity[]> {
   constructor(
      public readonly userId: string,
      public readonly status?: FollowStatus,
      public readonly skip?: number,
      public readonly take?: number,
   ) {
      super();
   }
}
