export class BioChangedEvent {
   constructor(
      public readonly userId: string,
      public readonly oldBio: string | null,
      public readonly newBio: string | null,
      public readonly changedAt: Date = new Date(),
   ) {}
}
