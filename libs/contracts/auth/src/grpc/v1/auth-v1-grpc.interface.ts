import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type {
   ICheckEmailRequest,
   ICheckEmailResponse,
   ILoginRequest,
   ILoginResponse,
   IRefreshTokenRequest,
   IRefreshTokenResponse,
   ISendRegisterOtpRequest,
   ISendRegisterOtpResponse,
   IVerifyRegisterOtpRequest,
   IVerifyRegisterOtpResponse,
   IRegisterRequest,
   IGetSessionsRequest,
   IGetSessionsResponse,
   IRevokeSessionRequest,
   IRevokeOtherSessionsRequest,
   IRevokeOtherSessionsResponse,
   IRevokeTokenRequest,
   IRevokeTokenResponse,
   IRevokeAllUserTokensRequest,
   ILogoutAllRequest,
   IValidateTokenRequest,
   IValidateTokenResponse,
   IChangePasswordRequest,
   IChangePasswordResponse,
   IVerifyChangePasswordOtpRequest,
   IVerifyChangePasswordOtpResponse,
   IGetUserAuditLogsRequest,
   IQueryAuditLogsRequest,
   IAuditLogListResponse,
   IGetAuditLogByIdRequest,
   IGetAuditLogByIdResponse,
   IGetJwksRequest,
   IGetJwksResponse,
   IGetEmailRequest,
   IGetEmailResponse,
   IGetRolePermissionsRequest,
   IGetRolePermissionsResponse,
   IRegisterServicePermissionsRequest,
   IRegisterServicePermissionsResponse,
} from '@contracts/auth/grpc/v1/messages';

export interface IAuthV1GrpcService {
   // Core Auth
   checkEmail(request: ICheckEmailRequest, metadata?: Metadata): Observable<ICheckEmailResponse>;
   login(request: ILoginRequest, metadata?: Metadata): Observable<ILoginResponse>;
   refreshToken(request: IRefreshTokenRequest, metadata?: Metadata): Observable<IRefreshTokenResponse>;

   sendRegisterOtp(request: ISendRegisterOtpRequest, metadata?: Metadata): Observable<ISendRegisterOtpResponse>;
   verifyRegisterOtp(request: IVerifyRegisterOtpRequest, metadata?: Metadata): Observable<IVerifyRegisterOtpResponse>;
   register(request: IRegisterRequest, metadata?: Metadata): Observable<ILoginResponse>;

   getSessions(request: IGetSessionsRequest, metadata?: Metadata): Observable<IGetSessionsResponse>;
   revokeSession(request: IRevokeSessionRequest, metadata?: Metadata): Observable<IRevokeTokenResponse>;
   revokeOtherSessions(
      request: IRevokeOtherSessionsRequest,
      metadata?: Metadata,
   ): Observable<IRevokeOtherSessionsResponse>;
   revokeToken(request: IRevokeTokenRequest, metadata?: Metadata): Observable<IRevokeTokenResponse>;
   revokeAllUserTokens(request: IRevokeAllUserTokensRequest, metadata?: Metadata): Observable<IRevokeTokenResponse>;
   logoutAll(request: ILogoutAllRequest, metadata?: Metadata): Observable<IRevokeTokenResponse>;
   validateToken(request: IValidateTokenRequest, metadata?: Metadata): Observable<IValidateTokenResponse>;

   changePassword(request: IChangePasswordRequest, metadata?: Metadata): Observable<IChangePasswordResponse>;
   verifyChangePasswordOtp(
      request: IVerifyChangePasswordOtpRequest,
      metadata?: Metadata,
   ): Observable<IVerifyChangePasswordOtpResponse>;

   getUserAuditLogs(request: IGetUserAuditLogsRequest, metadata?: Metadata): Observable<IAuditLogListResponse>;
   getAuditLogs(request: IQueryAuditLogsRequest, metadata?: Metadata): Observable<IAuditLogListResponse>;
   getAuditLogById(request: IGetAuditLogByIdRequest, metadata?: Metadata): Observable<IGetAuditLogByIdResponse>;
   getJwks(request: IGetJwksRequest, metadata?: Metadata): Observable<IGetJwksResponse>;
   getEmail(request: IGetEmailRequest, metadata?: Metadata): Observable<IGetEmailResponse>;
   getRolePermissions(
      request: IGetRolePermissionsRequest,
      metadata?: Metadata,
   ): Observable<IGetRolePermissionsResponse>;
   registerServicePermissions(
      request: IRegisterServicePermissionsRequest,
      metadata?: Metadata,
   ): Observable<IRegisterServicePermissionsResponse>;
}

// Aliases for compatibility
export type IAuthGrpcService = IAuthV1GrpcService;
