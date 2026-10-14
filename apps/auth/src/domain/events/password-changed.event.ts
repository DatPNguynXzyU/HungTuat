import type { IDeviceInfo } from '@common';

export class PasswordChangedEvent {
   constructor(
      public readonly accountId: string,
      public readonly email: string,
      public readonly changedAt: Date,
      public readonly ipAddress?: string,
      public readonly deviceInfo?: IDeviceInfo,
   ) {}
}
