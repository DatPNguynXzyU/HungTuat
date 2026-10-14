export class LoginFailedEvent {
   constructor(
      public readonly email: string,
      public readonly reason: string,
      public readonly failedAt: Date,
      public readonly ipAddress?: string,
      public readonly consecutiveFailures?: number,
   ) {}
}
