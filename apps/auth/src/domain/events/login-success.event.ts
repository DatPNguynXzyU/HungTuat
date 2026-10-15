import type { IDeviceInfo } from '@common';

export class LoginSuccessEvent {
   constructor(
      public readonly accountId: string,
      public readonly email: string,
      public readonly loginAt: Date,
      public readonly ipAddress?: string,
      public readonly deviceInfo?: IDeviceInfo,
      public readonly durationSeconds?: number,
   ) {}
}
