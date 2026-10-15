import { FollowStatus } from '@user/core/database/entities';

export class UserFollowedEvent {
   constructor(
      public readonly followId: string,
      public readonly followerId: string,
      public readonly followingId: string,
      public readonly status: FollowStatus,
      public readonly followedAt: Date = new Date(),
   ) {}
}
