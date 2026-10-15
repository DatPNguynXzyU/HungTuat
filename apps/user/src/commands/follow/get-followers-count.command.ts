import { Command } from '@common';
import type { FollowStatus } from '@user/core/database/entities';

export class GetFollowersCountCommand extends Command<{ count: number }> {
   constructor(
      public readonly userId: string,
      public readonly status?: FollowStatus,
   ) {
      super();
   }
}
