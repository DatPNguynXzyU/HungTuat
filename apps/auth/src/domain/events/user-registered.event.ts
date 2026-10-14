import type { IDeviceInfo } from '@common';

export class UserRegisteredEvent {
   constructor(
      public readonly accountId: string,
      public readonly email: string,
      public readonly registeredAt: Date,
      public readonly deviceInfo?: IDeviceInfo,
   ) {}
}
