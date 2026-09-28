import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   AUTH_PATTERNS,
   ChangePasswordDto,
   IAuditLogListResult,
   IAuthResult,
   IDeviceInfo,
   IJwksResponse,
   IRevokeSessionResult,
   IRevokeTokenResult,
   IUserSessionInfo,
   IValidateTokenResult,
   LoginDto,
   RegisterDto,
   SERVICES,
} from '@common';
import { firstValueFrom } from 'rxjs';

export type AuthResponseData = IAuthResult;
export type ValidateTokenResponse = IValidateTokenResult;
export type RevokeTokenResponse = IRevokeTokenResult;

@Injectable()
export class AuthService {
   constructor(@Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientProxy) {}

   async getJwks(): Promise<IJwksResponse> {
      return firstValueFrom(
         this.authClient.send<IJwksResponse, Record<string, never>>({ cmd: AUTH_PATTERNS.GET_JWKS }, {}),
      );
   }

   async register(registerDto: RegisterDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return firstValueFrom(
         this.authClient.send<IAuthResult, RegisterDto & { deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REGISTER },
            { ...registerDto, deviceInfo },
         ),
      );
   }

   async login(loginDto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return firstValueFrom(
         this.authClient.send<IAuthResult, LoginDto & { deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.LOGIN },
            { ...loginDto, deviceInfo },
         ),
      );
   }

   async refreshToken(refreshToken: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return firstValueFrom(
         this.authClient.send<IAuthResult, { refreshToken: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REFRESH_TOKEN },
            { refreshToken, deviceInfo },
         ),
      );
   }

   async getSessions(userId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      return firstValueFrom(
         this.authClient.send<IUserSessionInfo[], { userId: string; currentJti?: string }>(
            { cmd: AUTH_PATTERNS.GET_SESSIONS },
            { userId, currentJti },
         ),
      );
   }

   async revokeSession(userId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<IRevokeSessionResult> {
      return firstValueFrom(
         this.authClient.send<IRevokeSessionResult, { userId: string; sessionId: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_SESSION },
            { userId, sessionId, deviceInfo },
         ),
      );
   }

   async revokeOtherSessions(
      userId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      return firstValueFrom(
         this.authClient.send<IRevokeSessionResult, { userId: string; currentJti: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_OTHER_SESSIONS },
            { userId, currentJti, deviceInfo },
         ),
      );
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<IRevokeTokenResult> {
      return firstValueFrom(
         this.authClient.send<IRevokeTokenResult, { token: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_TOKEN },
            { token, deviceInfo },
         ),
      );
   }

   async revokeAllUserTokens(userId: string, deviceInfo?: IDeviceInfo): Promise<{ success: boolean; message: string }> {
      return firstValueFrom(
         this.authClient.send<{ success: boolean; message: string }, { userId: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_ALL_USER_TOKENS },
            { userId, deviceInfo },
         ),
      );
   }

   async logoutAll(userId: string, deviceInfo?: IDeviceInfo): Promise<{ success: boolean; message: string }> {
      return firstValueFrom(
         this.authClient.send<{ success: boolean; message: string }, { userId: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.LOGOUT_ALL },
            { userId, deviceInfo },
         ),
      );
   }

   async changePassword(
      userId: string,
      changePasswordDto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<{ success: boolean; message: string }> {
      return firstValueFrom(
         this.authClient.send<
            { success: boolean; message: string },
            { userId: string; changePasswordDto: ChangePasswordDto; deviceInfo?: IDeviceInfo }
         >({ cmd: AUTH_PATTERNS.CHANGE_PASSWORD }, { userId, changePasswordDto, deviceInfo }),
      );
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      return firstValueFrom(
         this.authClient.send<IValidateTokenResult, { token: string }>(
            { cmd: AUTH_PATTERNS.VALIDATE_TOKEN },
            { token },
         ),
      );
   }

   async getUserAuditLogs(userId: string, page = 1, limit = 10): Promise<IAuditLogListResult> {
      return firstValueFrom(
         this.authClient.send<IAuditLogListResult, { userId: string; page?: number; limit?: number }>(
            { cmd: AUTH_PATTERNS.GET_USER_AUDIT_LOGS },
            { userId, page, limit },
         ),
      );
   }
}
