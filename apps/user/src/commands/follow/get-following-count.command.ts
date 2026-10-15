import { Command } from '@common';
import type { FollowStatus } from '@user/entities';

export class GetFollowingCountCommand extends Command<{ count: number }> {
   constructor(
      public readonly userId: string,
      public readonly status?: FollowStatus,
   ) {
      super();
   }
}
