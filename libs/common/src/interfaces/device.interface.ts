export const CLIENT_TYPES = {
   WEB: 'web',
   MOBILE: 'mobile',
   DESKTOP: 'desktop',
} as const;

export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES];

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
   clientType?: ClientType;
   appVersion?: string;
}
