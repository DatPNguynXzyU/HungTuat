export interface IAuthUser {
   id: string;
   email: string;
   roles: string[];
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string | null;
   createdAt: string;
   updatedAt?: string;
}

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
   // New fields for multi-platform support
   deviceId?: string;
   clientType?: 'web' | 'mobile' | 'desktop';
   appVersion?: string;
}

export interface IUserSessionInfo {
   id: string;
   deviceType?: string | null;
   deviceName?: string | null;
   browser?: string | null;
   os?: string | null;
   ipAddress?: string | null;
   city?: string | null;
   region?: string | null;
   country?: string | null;
   countryCode?: string | null;
   userAgent?: string | null;
   isCurrent: boolean;
   lastActiveAt: string;
   expiresAt: string;
   createdAt: string;
}

export interface IAuthTokens {
   accessToken: string;
   refreshToken: string;
   tokenType: 'Bearer';
   expiresIn: number;
}

export interface IAuthResult {
   user: IAuthUser;
   accessToken: string;
   refreshToken: string;
   // New field for mobile/API clients
   tokens?: IAuthTokens;
}

export interface IValidateTokenResult {
   valid: boolean;
   user: IAuthUser;
}

export interface IRevokeTokenResult {
   success?: boolean;
}

export interface IRevokeSessionResult {
   success?: boolean;
   revokedCount?: number;
}

export interface IJsonWebKey {
   kty: string;
   use?: string;
   alg?: string;
   kid?: string;
   n?: string;
   e?: string;
   [key: string]: unknown;
}

export interface IJwksResponse {
   keys: IJsonWebKey[];
}
