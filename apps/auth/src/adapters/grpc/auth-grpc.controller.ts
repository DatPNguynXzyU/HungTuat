import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { from, type Observable } from 'rxjs';
import {
   CLIENT_TYPES,
   CommandBus,
   GrpcExceptionFilter,
   GrpcLoggingInterceptor,
   GrpcMetricsInterceptor,
   type ClientType,
   type IDeviceInfo,
} from '@common';
import {
   AUTH_V1_GRPC_METHODS,
   AUTH_V1_GRPC_SERVICE_NAME,
   type IAuthResult,
   type IAuthV1GrpcService,
   type ICheckEmailRequest,
   type ICheckEmailResponse,
   type IDeviceInfoProto,
   type ILoginRequest,
   type ILoginResponse,
   type IRefreshTokenRequest,
   type IRefreshTokenResponse,
   type LoginDto,
} from '@contracts/auth';
import { CheckEmailCommand } from '@auth/commands/registration/check-email.command';
import { LoginCommand } from '@auth/commands/auth/login.command';
import { RefreshTokenCommand } from '@auth/commands/auth/refresh-token.command';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC requests for Auth V1.
 * Adapts gRPC requests (CheckEmail, Login, RefreshToken) into domain Commands and delegates to CommandBus.
 */
@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class AuthGrpcController implements IAuthV1GrpcService {
   constructor(private readonly commandBus: CommandBus) {}

   private resolveClientType(type?: string): ClientType | undefined {
      if (!type) {
         return undefined;
      }
      const normalized = type.toLowerCase();
      const validTypes: readonly string[] = Object.values(CLIENT_TYPES);
      return validTypes.includes(normalized) ? (normalized as ClientType) : undefined;
   }

   private mapDeviceInfo(deviceInfo?: IDeviceInfoProto): IDeviceInfo | undefined {
      if (!deviceInfo) {
         return undefined;
      }
      return {
         deviceType: deviceInfo.deviceType || undefined,
         deviceName: deviceInfo.deviceName || undefined,
         browser: deviceInfo.browser || undefined,
         os: deviceInfo.os || undefined,
         userAgent: deviceInfo.userAgent || undefined,
         ipAddress: deviceInfo.ipAddress || undefined,
         city: deviceInfo.city || undefined,
         region: deviceInfo.region || undefined,
         country: deviceInfo.country || undefined,
         countryCode: deviceInfo.countryCode || undefined,
         deviceId: deviceInfo.deviceId || undefined,
         clientType: this.resolveClientType(deviceInfo.clientType),
         appVersion: deviceInfo.appVersion || undefined,
      };
   }

   private mapAuthResult(result: IAuthResult): ILoginResponse {
      return {
         user: {
            id: result.user.id,
            email: result.user.email,
            roles: result.user.roles || [],
            status: result.user.status || '',
            isEmailVerified: result.user.isEmailVerified ?? false,
            lastLoginAt: result.user.lastLoginAt || '',
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt || '',
         },
         accessToken: result.accessToken,
         refreshToken: result.refreshToken,
         tokens: result.tokens
            ? {
                 accessToken: result.tokens.accessToken,
                 refreshToken: result.tokens.refreshToken,
                 tokenType: result.tokens.tokenType,
                 expiresIn: result.tokens.expiresIn,
              }
            : undefined,
      };
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.CHECK_EMAIL)
   checkEmail(data: ICheckEmailRequest): Observable<ICheckEmailResponse> {
      return from(this.commandBus.execute(new CheckEmailCommand(data.email)));
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.LOGIN)
   login(data: ILoginRequest): Observable<ILoginResponse> {
      const loginDto: LoginDto = {
         email: data.email,
         password: data.password,
         ip: data.ip || undefined,
         deviceId: data.deviceId || undefined,
         clientType: this.resolveClientType(data.clientType),
         appVersion: data.appVersion || undefined,
      };

      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);

      return from(
         this.commandBus
            .execute(new LoginCommand(loginDto, deviceInfo))
            .then((result: IAuthResult): ILoginResponse => this.mapAuthResult(result)),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REFRESH_TOKEN)
   refreshToken(data: IRefreshTokenRequest): Observable<IRefreshTokenResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);

      return from(
         this.commandBus
            .execute(new RefreshTokenCommand(data.refreshToken, deviceInfo))
            .then((result: IAuthResult): IRefreshTokenResponse => this.mapAuthResult(result)),
      );
   }
}
