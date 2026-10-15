export class FollowRequestRejectedEvent {
   constructor(
      public readonly followId: string,
      public readonly followerId: string,
      public readonly followingId: string,
      public readonly rejectedAt: Date = new Date(),
   ) {}
}
