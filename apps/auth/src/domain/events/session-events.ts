import type { AuthMetricSessionOperation } from '@auth/constants';

export class SessionsRevokedOthersEvent {
   constructor(
      public readonly accountId: string,
      public readonly currentJti: string,
      public readonly revokedCount: number,
   ) {}
}

export class SessionsRevokedAllEvent {
   constructor(public readonly accountId: string) {}
}

export class ActiveSessionsCountedEvent {
   constructor(public readonly count: number) {}
}

export class SessionRevokeFailedEvent {
   constructor(
      public readonly accountId: string,
      public readonly operation: AuthMetricSessionOperation,
      public readonly error?: unknown,
   ) {}
}
