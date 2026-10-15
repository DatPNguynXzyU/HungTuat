export class UserUnfollowedEvent {
   constructor(
      public readonly followerId: string,
      public readonly followingId: string,
      public readonly unfollowedAt: Date = new Date(),
   ) {}
}
