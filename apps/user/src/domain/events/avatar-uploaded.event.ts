export class AvatarUploadedEvent {
   constructor(
      public readonly userId: string,
      public readonly avatarUrl: string,
      public readonly uploadedAt: Date = new Date(),
   ) {}
}
