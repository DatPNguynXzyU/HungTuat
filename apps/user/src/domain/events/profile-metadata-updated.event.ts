/**
 * Event emitted when non-critical profile metadata fields are updated
 * (website, location, gender, dateOfBirth, coverImage, etc.)
 */
export class ProfileMetadataUpdatedEvent {
   constructor(
      public readonly userId: string,
      public readonly metadata: Record<string, unknown>,
      public readonly updatedAt: Date = new Date(),
   ) {}
}
