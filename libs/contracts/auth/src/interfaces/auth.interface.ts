export interface ITokenAccountPayload {
   id: string;
   email: string;
   roles: string[];
}

export interface IAuthUser {
   userId: string;
   email: string;
   roles: string[];
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string | null;
   createdAt: string;
   updatedAt?: string;
}

export interface IUserSessionInfo {
   sessionId: string;
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

export { CLIENT_TYPES, type ClientType, type IJsonWebKey, type IJwksResponse, type IDeviceInfo } from '@common';
