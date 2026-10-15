import type { AuthMetricOtpOperation, AuthMetricOtpType } from '@auth/constants';

export class OtpGeneratedEvent {
   constructor(
      public readonly type: AuthMetricOtpType,
      public readonly durationSeconds: number,
      public readonly email?: string,
   ) {}
}

export class OtpVerifiedEvent {
   constructor(
      public readonly type: AuthMetricOtpType,
      public readonly durationSeconds: number,
      public readonly email?: string,
   ) {}
}

export class OtpFailedEvent {
   constructor(
      public readonly operation: AuthMetricOtpOperation,
      public readonly type: AuthMetricOtpType,
      public readonly email?: string,
      public readonly reason?: string,
   ) {}
}
