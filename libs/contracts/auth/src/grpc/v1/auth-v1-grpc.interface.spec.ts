import type {
   IDeviceInfoProto as DirectDeviceProto,
   IAuthTokensProto,
   IAuthUserProto,
   IDeviceInfoProto,
} from '@contracts/auth/grpc/v1/models';
import type {
   ILoginRequest as DirectLoginReq,
   ICheckEmailRequest,
   ICheckEmailRequestV1,
   ICheckEmailResponse,
   ICheckEmailResponseV1,
   ILoginRequest,
   ILoginRequestV1,
   ILoginResponse,
   ILoginResponseV1,
   IRefreshTokenRequest,
   IRefreshTokenRequestV1,
   IRefreshTokenResponse,
   IRefreshTokenResponseV1,
} from '@contracts/auth/grpc/v1/messages';
import { IAuthGrpcService, IAuthV1GrpcService } from './auth-v1-grpc.interface';

describe('Auth V1 Modular gRPC Contracts', () => {
   it('should export all model interfaces and match shapes', () => {
      const device: IDeviceInfoProto = {
         deviceId: 'device-123',
         deviceName: 'MacBook Pro',
         browser: 'Chrome',
         os: 'macOS',
         ipAddress: '127.0.0.1',
      };
      const directDevice: DirectDeviceProto = device;
      expect(directDevice.deviceId).toBe('device-123');

      const user: IAuthUserProto = {
         id: 'user-123',
         email: 'test@example.com',
         roles: ['USER'],
         createdAt: '2026-10-21T00:00:00.000Z',
      };
      expect(user.id).toBe('user-123');

      const tokens: IAuthTokensProto = {
         accessToken: 'access-token',
         refreshToken: 'refresh-token',
         tokenType: 'Bearer',
         expiresIn: 3600,
      };
      expect(tokens.tokenType).toBe('Bearer');
   });

   it('should export all message interfaces and support compatibility aliases', () => {
      const checkEmailReq: ICheckEmailRequest = { email: 'test@example.com' };
      const checkEmailReqV1: ICheckEmailRequestV1 = checkEmailReq;
      expect(checkEmailReqV1.email).toBe('test@example.com');

      const checkEmailRes: ICheckEmailResponse = { available: true, email: 'test@example.com' };
      const checkEmailResV1: ICheckEmailResponseV1 = checkEmailRes;
      expect(checkEmailResV1.available).toBe(true);

      const loginReq: ILoginRequest = { email: 'test@example.com', password: 'secretPassword' };
      const loginReqV1: ILoginRequestV1 = loginReq;
      const directLoginReq: DirectLoginReq = loginReq;
      expect(loginReqV1.email).toBe(directLoginReq.email);

      const loginRes: ILoginResponse = {
         user: {
            id: 'u-1',
            email: 'test@example.com',
            roles: ['USER'],
            createdAt: '2026-10-21T00:00:00.000Z',
         },
         accessToken: 'at',
         refreshToken: 'rt',
      };
      const loginResV1: ILoginResponseV1 = loginRes;
      expect(loginResV1.accessToken).toBe('at');

      const refreshReq: IRefreshTokenRequest = { refreshToken: 'rt' };
      const refreshReqV1: IRefreshTokenRequestV1 = refreshReq;
      expect(refreshReqV1.refreshToken).toBe('rt');

      const refreshRes: IRefreshTokenResponse = {
         user: {
            id: 'u-1',
            email: 'test@example.com',
            roles: ['USER'],
            createdAt: '2026-10-21T00:00:00.000Z',
         },
         accessToken: 'at-new',
         refreshToken: 'rt-new',
      };
      const refreshResV1: IRefreshTokenResponseV1 = refreshRes;
      expect(refreshResV1.accessToken).toBe('at-new');
   });

   it('should maintain IAuthGrpcService alias compatibility for IAuthV1GrpcService', () => {
      const isServiceTypeCompatible = true;
      type IsExact<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
      const compatibilityCheck: IsExact<IAuthGrpcService, IAuthV1GrpcService> = true;
      expect(isServiceTypeCompatible).toBe(compatibilityCheck);
   });
});
