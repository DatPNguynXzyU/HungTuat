export interface IUserSessionProto {
   sessionId: string;
   deviceType?: string;
   deviceName?: string;
   browser?: string;
   os?: string;
   ipAddress?: string;
   city?: string;
   region?: string;
   country?: string;
   countryCode?: string;
   userAgent?: string;
   isCurrent: boolean;
   lastActiveAt: string;
   expiresAt: string;
   createdAt: string;
}
