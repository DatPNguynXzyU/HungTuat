export class FollowRequestAcceptedEvent {
   constructor(
      public readonly followId: string,
      public readonly followerId: string,
      public readonly followingId: string,
      public readonly acceptedAt: Date = new Date(),
   ) {}
}
