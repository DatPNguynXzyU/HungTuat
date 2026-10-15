export class UserCreatedEvent {
   constructor(
      public readonly userId: string,
      public readonly accountId: string,
      public readonly username?: string | null,
      public readonly displayName?: string | null,
      public readonly createdAt: Date = new Date(),
   ) {}
}
