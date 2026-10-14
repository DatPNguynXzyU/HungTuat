export class AccountLockedEvent {
   constructor(
      public readonly accountId: string | null,
      public readonly email: string,
      public readonly ipAddress: string,
      public readonly reason: string,
      public readonly lockedUntil: Date,
      public readonly failedAttempts: number,
   ) {}
}
