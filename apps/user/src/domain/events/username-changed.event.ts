export class UsernameChangedEvent {
   constructor(
      public readonly userId: string,
      public readonly oldUsername: string | null,
      public readonly newUsername: string,
      public readonly changedAt: Date = new Date(),
   ) {}
}
