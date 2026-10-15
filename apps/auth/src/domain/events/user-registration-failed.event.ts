import type { IDeviceInfo } from '@common';

export class UserRegistrationFailedEvent {
   constructor(
      public readonly email: string,
      public readonly reason: string,
      public readonly failedAt: Date,
      public readonly deviceInfo?: IDeviceInfo,
   ) {}
}
