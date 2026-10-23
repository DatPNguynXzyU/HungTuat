import type { IDeviceInfoProto } from '../models/auth-device.interface';
import type { IUserSessionProto } from '../models/auth-session.interface';
import type { IAuthUserProto } from '../models/auth-user.interface';

export interface IGetSessionsRequest {
   userId: string;
   currentJti?: string;
}

export interface IGetSessionsResponse {
   sessions: IUserSessionProto[];
}

export interface IRevokeSessionRequest {
   userId: string;
   sessionId: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IRevokeOtherSessionsRequest {
   userId: string;
   currentJti: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IRevokeOtherSessionsResponse {
   success: boolean;
   revokedCount: number;
}

export interface IRevokeTokenRequest {
   token: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IRevokeTokenResponse {
   success: boolean;
}

export interface IRevokeAllUserTokensRequest {
   userId: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface ILogoutAllRequest {
   userId: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IValidateTokenRequest {
   token: string;
}

export interface IValidateTokenResponse {
   valid: boolean;
   user?: IAuthUserProto;
}
