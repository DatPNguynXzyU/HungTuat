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
   type IServiceMessage,
} from '@common';
import {
   AUTH_V1_GRPC_METHODS,
   AUTH_V1_GRPC_SERVICE_NAME,
   type ChangePasswordResponseDto,
   type DeviceSessionResponseDto,
   type IAuditLogListResponse,
   type IAuditLogListResult,
   type IAuthResult,
   type IAuthV1GrpcService,
   type IChangePasswordRequest,
   type IChangePasswordResponse,
   type ICheckEmailRequest,
   type ICheckEmailResponse,
   type IDeviceInfoProto,
   type IGetAuditLogByIdRequest,
   type IGetAuditLogByIdResponse,
   type IGetEmailRequest,
   type IGetEmailResponse,
   type IGetJwksRequest,
   type IGetJwksResponse,
   type IGetRolePermissionsRequest,
   type IGetRolePermissionsResponse,
   type IGetSessionsRequest,
   type IGetSessionsResponse,
   type IGetUserAuditLogsRequest,
   type IJwksResponse,
   type ILoginRequest,
   type ILoginResponse,
   type ILogoutAllRequest,
   type IQueryAuditLogsRequest,
   type IRefreshTokenRequest,
   type IRefreshTokenResponse,
   type IRegisterRequest,
   type IRevokeAllUserTokensRequest,
   type IRevokeOtherSessionsRequest,
   type IRevokeOtherSessionsResponse,
   type IRevokeSessionRequest,
   type IRevokeSessionResult,
   type IRevokeTokenRequest,
   type IRevokeTokenResponse,
   type ISecurityAuditLog,
   type ISecurityAuditLogProto,
   type ISendRegisterOtpRequest,
   type ISendRegisterOtpResponse,
   type IUserSessionProto,
   type IRegisterServicePermissionsRequest,
   type IRegisterServicePermissionsResponse,
   type IValidateTokenRequest,
   type IValidateTokenResponse,
   type IValidateTokenResult,
   type IVerifyChangePasswordOtpRequest,
   type IVerifyChangePasswordOtpResponse,
   type IVerifyRegisterOtpRequest,
   type IVerifyRegisterOtpResponse,
   type LoginDto,
   type QueryAuditLogDto,
   type SendRegisterOtpResponseDto,
   type VerifyChangePasswordOtpResponseDto,
   type VerifyRegisterOtpResponseDto,
   type UserEmailResponseDto,
} from '@contracts/auth';
import {
   ChangePasswordCommand,
   CheckEmailCommand,
   GetAccountAuditLogsCommand,
   GetAuditLogByIdCommand,
   GetAuditLogsCommand,
   GetEmailCommand,
   GetJwksCommand,
   GetRolePermissionsCommand,
   GetSessionsCommand,
   LoginCommand,
   LogoutAllCommand,
   RefreshTokenCommand,
   RegisterCommand,
   RegisterServicePermissionsCommand,
   RevokeAllAccountTokensCommand,
   RevokeOtherSessionsCommand,
   RevokeSessionCommand,
   RevokeTokenCommand,
   SendRegisterOtpCommand,
   ValidateTokenCommand,
   VerifyChangePasswordOtpCommand,
   VerifyRegisterOtpCommand,
} from '@auth/commands';
import type { SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC requests for Auth V1.
 * Adapts gRPC requests into domain Commands and delegates to CommandBus.
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
      const user = result.user;
      const rawUser = user as unknown as { id?: string; userId?: string };
      return {
         user: {
            userId: user.userId || rawUser.id || '',
            email: user.email,
            roles: user.roles || [],
            status: user.status || '',
            isEmailVerified: user.isEmailVerified ?? false,
            lastLoginAt: user.lastLoginAt || '',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt || '',
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

   private mapSecurityAuditLog(item: ISecurityAuditLog | SecurityAuditLogEntity): ISecurityAuditLogProto {
      return {
         auditLogId: item.auditLogId || (item as unknown as { id?: string }).id || '',
         userId: item.accountId || undefined,
         accountId: item.accountId || undefined,
         actorEmail: item.actorEmail || undefined,
         action: item.action,
         status: item.status,
         ipAddress: item.ipAddress || undefined,
         userAgent: item.userAgent || undefined,
         deviceType: item.deviceType || undefined,
         deviceName: item.deviceName || undefined,
         browser: item.browser || undefined,
         os: item.os || undefined,
         city: item.city || undefined,
         country: item.country || undefined,
         reason: item.reason || undefined,
         metadataJson: item.metadata ? JSON.stringify(item.metadata) : undefined,
         createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(item.createdAt).toISOString(),
      };
   }

   private mapAuditLogList(result: IAuditLogListResult): IAuditLogListResponse {
      return {
         items: (result.data || []).map((log) => this.mapSecurityAuditLog(log)),
         total: result.total,
         page: result.page,
         limit: result.limit,
         totalPages: result.totalPages,
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

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.SEND_REGISTER_OTP)
   sendRegisterOtp(data: ISendRegisterOtpRequest): Observable<ISendRegisterOtpResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new SendRegisterOtpCommand({ email: data.email }, deviceInfo))
            .then((res: SendRegisterOtpResponseDto): ISendRegisterOtpResponse => ({
               success: res.success,
               message: res.message,
               cooldownSeconds: res.cooldownSeconds,
               expiresInMinutes: res.expiresInMinutes,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.VERIFY_REGISTER_OTP)
   verifyRegisterOtp(data: IVerifyRegisterOtpRequest): Observable<IVerifyRegisterOtpResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new VerifyRegisterOtpCommand({ email: data.email, otp: data.otp }, deviceInfo))
            .then((res: VerifyRegisterOtpResponseDto): IVerifyRegisterOtpResponse => ({
               success: res.success,
               verificationToken: res.verificationToken,
               expiresInSeconds: res.expiresInSeconds,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REGISTER)
   register(data: IRegisterRequest): Observable<ILoginResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(
               new RegisterCommand(
                  {
                     email: data.email,
                     password: data.password,
                     confirmPassword: data.confirmPassword || data.password,
                     verificationToken: data.verificationToken,
                  },
                  deviceInfo,
               ),
            )
            .then((result: IAuthResult): ILoginResponse => this.mapAuthResult(result)),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_SESSIONS)
   getSessions(data: IGetSessionsRequest): Observable<IGetSessionsResponse> {
      return from(
         this.commandBus
            .execute(new GetSessionsCommand(data.userId, data.userId, data.currentJti))
            .then((sessions: DeviceSessionResponseDto[]): IGetSessionsResponse => ({
               sessions: (sessions || []).map((s): IUserSessionProto => ({
                  sessionId: s.sessionId || (s as unknown as { id?: string }).id || '',
                  deviceType: s.deviceType || undefined,
                  deviceName: s.deviceName || undefined,
                  browser: s.browser || undefined,
                  os: s.os || undefined,
                  ipAddress: s.ipAddress || undefined,
                  city: s.city || undefined,
                  region: s.region || undefined,
                  country: s.country || undefined,
                  countryCode: s.countryCode || undefined,
                  userAgent: s.userAgent || undefined,
                  isCurrent: s.isCurrent,
                  lastActiveAt: s.lastActiveAt,
                  expiresAt: s.expiresAt,
                  createdAt: s.createdAt,
               })),
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REVOKE_SESSION)
   revokeSession(data: IRevokeSessionRequest): Observable<IRevokeTokenResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new RevokeSessionCommand(data.sessionId, data.userId, data.userId, deviceInfo))
            .then((): IRevokeTokenResponse => ({ success: true })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REVOKE_OTHER_SESSIONS)
   revokeOtherSessions(data: IRevokeOtherSessionsRequest): Observable<IRevokeOtherSessionsResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new RevokeOtherSessionsCommand(data.currentJti, data.userId, data.userId, deviceInfo))
            .then((res: IRevokeSessionResult): IRevokeOtherSessionsResponse => ({
               success: res.success ?? true,
               revokedCount: res.revokedCount ?? 0,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REVOKE_TOKEN)
   revokeToken(data: IRevokeTokenRequest): Observable<IRevokeTokenResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new RevokeTokenCommand(data.token, deviceInfo))
            .then((): IRevokeTokenResponse => ({ success: true })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REVOKE_ALL_USER_TOKENS)
   revokeAllUserTokens(data: IRevokeAllUserTokensRequest): Observable<IRevokeTokenResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new RevokeAllAccountTokensCommand(data.userId, data.userId, deviceInfo))
            .then((): IRevokeTokenResponse => ({ success: true })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.LOGOUT_ALL)
   logoutAll(data: ILogoutAllRequest): Observable<IRevokeTokenResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new LogoutAllCommand(data.userId, data.userId, deviceInfo))
            .then((): IRevokeTokenResponse => ({ success: true })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.VALIDATE_TOKEN)
   validateToken(data: IValidateTokenRequest): Observable<IValidateTokenResponse> {
      return from(
         this.commandBus
            .execute(new ValidateTokenCommand(data.token))
            .then((res: IValidateTokenResult): IValidateTokenResponse => ({
               valid: res.valid,
               user: res.user
                  ? {
                       userId: res.user.userId || (res.user as unknown as { id?: string }).id || '',
                       email: res.user.email,
                       roles: res.user.roles || [],
                       status: res.user.status || undefined,
                       isEmailVerified: res.user.isEmailVerified,
                       lastLoginAt: res.user.lastLoginAt || undefined,
                       createdAt: res.user.createdAt,
                       updatedAt: res.user.updatedAt || undefined,
                    }
                  : undefined,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.CHANGE_PASSWORD)
   changePassword(data: IChangePasswordRequest): Observable<IChangePasswordResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(
               new ChangePasswordCommand(
                  {
                     currentPassword: data.currentPassword,
                     newPassword: data.newPassword,
                     confirmPassword: data.confirmPassword,
                     logoutAll: data.logoutAll,
                  },
                  data.userId,
                  data.userId,
                  deviceInfo,
               ),
            )
            .then((res: ChangePasswordResponseDto): IChangePasswordResponse => ({
               success: res.success,
               message: res.message,
               cooldownSeconds: res.cooldownSeconds,
               expiresInMinutes: res.expiresInMinutes,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.VERIFY_CHANGE_PASSWORD_OTP)
   verifyChangePasswordOtp(data: IVerifyChangePasswordOtpRequest): Observable<IVerifyChangePasswordOtpResponse> {
      const deviceInfo = this.mapDeviceInfo(data.deviceInfo);
      return from(
         this.commandBus
            .execute(new VerifyChangePasswordOtpCommand({ otp: data.otp }, data.userId, data.userId, deviceInfo))
            .then((res: VerifyChangePasswordOtpResponseDto): IVerifyChangePasswordOtpResponse => ({
               success: res.success,
               message: res.message,
               logoutAll: res.logoutAll,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_USER_AUDIT_LOGS)
   getUserAuditLogs(data: IGetUserAuditLogsRequest): Observable<IAuditLogListResponse> {
      return from(
         this.commandBus
            .execute(new GetAccountAuditLogsCommand(data.userId, data.userId, data.page, data.limit))
            .then((res: IAuditLogListResult): IAuditLogListResponse => this.mapAuditLogList(res)),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_AUDIT_LOGS)
   getAuditLogs(data: IQueryAuditLogsRequest): Observable<IAuditLogListResponse> {
      const message: IServiceMessage<QueryAuditLogDto> = {
         data: {
            page: data.page,
            limit: data.limit,
            accountId: data.accountId,
            actorEmail: data.actorEmail,
            action: data.action,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
         },
         user: data.requestingUserId
            ? {
                 userId: data.requestingUserId,
                 email: data.actorEmail || '',
                 roles: data.requestingRoles || [],
                 permissions: data.requestingPermissions || [],
              }
            : undefined,
      };

      return from(
         this.commandBus
            .execute(new GetAuditLogsCommand(message))
            .then((res: IAuditLogListResult): IAuditLogListResponse => this.mapAuditLogList(res)),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_AUDIT_LOG_BY_ID)
   getAuditLogById(data: IGetAuditLogByIdRequest): Observable<IGetAuditLogByIdResponse> {
      const message: IServiceMessage<{ id: string }> = {
         data: { id: data.auditLogId },
         user: data.requestingUserId
            ? {
                 userId: data.requestingUserId,
                 roles: data.requestingRoles || [],
                 permissions: data.requestingPermissions || [],
              }
            : undefined,
      };

      return from(
         this.commandBus
            .execute(new GetAuditLogByIdCommand(message))
            .then((res: SecurityAuditLogEntity | null): IGetAuditLogByIdResponse => ({
               auditLog: res ? this.mapSecurityAuditLog(res) : undefined,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_JWKS)
   getJwks(_data: IGetJwksRequest): Observable<IGetJwksResponse> {
      return from(
         this.commandBus.execute(new GetJwksCommand()).then((res: IJwksResponse): IGetJwksResponse => ({
            keysJson: JSON.stringify(res),
         })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_EMAIL)
   getEmail(data: IGetEmailRequest): Observable<IGetEmailResponse> {
      return from(
         this.commandBus
            .execute(new GetEmailCommand(data.accountId))
            .then((res: UserEmailResponseDto): IGetEmailResponse => ({
               accountId: res.accountId || (res as unknown as { id?: string }).id || '',
               email: res.email,
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.GET_ROLE_PERMISSIONS)
   getRolePermissions(data: IGetRolePermissionsRequest): Observable<IGetRolePermissionsResponse> {
      return from(
         this.commandBus
            .execute(new GetRolePermissionsCommand(data.roleCode))
            .then((permissions: string[]): IGetRolePermissionsResponse => ({
               permissions: permissions || [],
            })),
      );
   }

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.REGISTER_SERVICE_PERMISSIONS)
   registerServicePermissions(
      data: IRegisterServicePermissionsRequest,
   ): Observable<IRegisterServicePermissionsResponse> {
      const serviceName = data.serviceName || data.service_name || '';
      return from(
         this.commandBus
            .execute(new RegisterServicePermissionsCommand(serviceName, data.permissions || []))
            .then((upsertedCount: number): IRegisterServicePermissionsResponse => ({
               upsertedCount,
               success: true,
            })),
      );
   }
}
