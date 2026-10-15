import type { IDeviceInfo } from '@common';
import type { AccountEntity } from '@auth/entities';

export interface LoginValidationContext {
   readonly email: string;
   readonly password: string;
   readonly clientIp: string;
   readonly deviceInfo?: IDeviceInfo;
   readonly lockoutKey: string;
   readonly failedAttemptsKey: string;
   account?: AccountEntity;
}
