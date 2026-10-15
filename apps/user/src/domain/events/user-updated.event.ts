export class UserUpdatedEvent {
   constructor(
      public readonly userId: string,
      public readonly accountId: string,
      public readonly changes: Record<string, unknown>,
      public readonly updatedAt: Date = new Date(),
   ) {}
}
