import { Command } from '@common';

export interface CheckIsFollowingResult {
   isFollowing: boolean;
   status?: string;
}

export class CheckIsFollowingCommand extends Command<CheckIsFollowingResult> {
   constructor(
      public readonly followerId: string,
      public readonly followingId: string,
   ) {
      super();
   }
}
