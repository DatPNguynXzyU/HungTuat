import type { IAuthTokensProto, IAuthUserProto, IDeviceInfoProto } from '@contracts/auth/grpc/v1/models';

export interface IRefreshTokenRequest {
   refreshToken: string;
   deviceInfo?: IDeviceInfoProto;
}

export interface IRefreshTokenResponse {
   user: IAuthUserProto;
   accessToken: string;
   refreshToken: string;
   tokens?: IAuthTokensProto;
}

// Aliases for compatibility
export type IRefreshTokenRequestV1 = IRefreshTokenRequest;
export type IRefreshTokenResponseV1 = IRefreshTokenResponse;
