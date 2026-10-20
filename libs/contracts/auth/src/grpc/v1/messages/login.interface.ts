import type { ClientType } from '@common';
import type { IAuthTokensProto, IAuthUserProto, IDeviceInfoProto } from '@contracts/auth/grpc/v1/models';

export interface ILoginRequest {
   email: string;
   password: string;
   ip?: string;
   deviceId?: string;
   clientType?: ClientType;
   appVersion?: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface ILoginResponse {
   user: IAuthUserProto;
   accessToken: string;
   refreshToken: string;
   tokens?: IAuthTokensProto;
}

// Aliases for compatibility
export type ILoginRequestV1 = ILoginRequest;
export type ILoginResponseV1 = ILoginResponse;
