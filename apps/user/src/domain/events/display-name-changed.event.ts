export class DisplayNameChangedEvent {
   constructor(
      public readonly userId: string,
      public readonly oldDisplayName: string | null,
      public readonly newDisplayName: string | null,
      public readonly changedAt: Date = new Date(),
   ) {}
}
