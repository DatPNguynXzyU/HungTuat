import type { ClientType } from '@common';

export interface IDeviceInfoProto {
   deviceType?: string;
   deviceName?: string;
   browser?: string;
   os?: string;
   userAgent?: string;
   ipAddress?: string;
   city?: string;
   region?: string;
   country?: string;
   countryCode?: string;
   deviceId?: string;
   clientType?: ClientType;
   appVersion?: string;
}
