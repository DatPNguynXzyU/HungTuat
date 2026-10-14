export interface IDeviceInfo {
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
   clientType?: 'web' | 'mobile' | 'desktop';
   appVersion?: string;
}
