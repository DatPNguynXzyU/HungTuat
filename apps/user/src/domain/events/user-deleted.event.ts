export class UserDeletedEvent {
   constructor(
      public readonly userId: string,
      public readonly accountId: string,
      public readonly deletedAt: Date = new Date(),
   ) {}
}
