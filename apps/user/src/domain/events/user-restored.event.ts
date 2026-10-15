export class UserRestoredEvent {
   constructor(
      public readonly userId: string,
      public readonly accountId: string,
      public readonly restoredAt: Date = new Date(),
   ) {}
}
