import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import {
   CircuitBreakerRegistry,
   createGrpcMetadata,
   handleGrpcError,
   RetryPolicyRegistry,
   SERVICE_NAMES,
   withGrpcRetry,
   type IDeviceInfo,
} from '@common';
import {
   AUTH_V1_GRPC_CLIENT,
   AUTH_V1_GRPC_SERVICE_NAME,
   type ChangePasswordDto,
   type ChangePasswordResponseDto,
   type IDeviceInfoProto,
   type IJwksResponse,
   type IRevokeSessionResult,
   type IAuthResult,
   type IAuthUser,
   type IAuthV1GrpcService,
   type ILoginResponse,
   type IRefreshTokenResponse,
   type IUserSessionInfo,
   type IValidateTokenResult,
   type LoginDto,
   type RegisterDto,
   type SendRegisterOtpDto,
   type SendRegisterOtpResponseDto,
   type UserEmailResponseDto,
   type VerifyChangePasswordOtpDto,
   type VerifyChangePasswordOtpResponseDto,
   type VerifyRegisterOtpDto,
   type VerifyRegisterOtpResponseDto,
   type IAuditLogListResult,
   type ISecurityAuditLog,
} from '@contracts/auth';
import {
   HEALTH_GRPC_SERVICE_NAME,
   ServingStatus,
   type IHealthCheckResponse,
   type IHealthGrpcService,
} from '@contracts/health';
import { defer, firstValueFrom } from 'rxjs';

export type ValidateTokenResponse = IValidateTokenResult;
export type RevokeTokenResponse = { success?: boolean };

@Injectable()
export class AuthService implements OnModuleInit {
   private authGrpcService!: IAuthV1GrpcService;
   private readonly authGrpcBreaker = CircuitBreakerRegistry.getOrCreate(AUTH_V1_GRPC_SERVICE_NAME, {
      timeout: 3000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });
   private readonly authGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(AUTH_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(@Inject(AUTH_V1_GRPC_CLIENT) private readonly authGrpcClient: ClientGrpc) {}

   onModuleInit(): void {
      this.authGrpcService = this.authGrpcClient.getService<IAuthV1GrpcService>(AUTH_V1_GRPC_SERVICE_NAME);
   }

   private toProtoDeviceInfo(deviceInfo?: IDeviceInfo): IDeviceInfoProto | undefined {
      if (!deviceInfo) {
         return undefined;
      }
      return {
         deviceType: deviceInfo.deviceType,
         deviceName: deviceInfo.deviceName,
         browser: deviceInfo.browser,
         os: deviceInfo.os,
         userAgent: deviceInfo.userAgent,
         ipAddress: deviceInfo.ipAddress,
         city: deviceInfo.city,
         region: deviceInfo.region,
         country: deviceInfo.country,
         countryCode: deviceInfo.countryCode,
         deviceId: deviceInfo.deviceId,
         clientType: deviceInfo.clientType,
         appVersion: deviceInfo.appVersion,
      };
   }

   private mapGrpcAuthResponse(response: ILoginResponse | IRefreshTokenResponse): IAuthResult {
      return {
         user: {
            userId: response.user.userId,
            email: response.user.email,
            roles: response.user.roles || [],
            status: response.user.status || undefined,
            isEmailVerified: response.user.isEmailVerified,
            lastLoginAt: response.user.lastLoginAt ? response.user.lastLoginAt : null,
            createdAt: response.user.createdAt,
            updatedAt: response.user.updatedAt || undefined,
         },
         accessToken: response.accessToken,
         refreshToken: response.refreshToken,
         tokens: response.tokens
            ? {
                 accessToken: response.tokens.accessToken,
                 refreshToken: response.tokens.refreshToken,
                 tokenType: response.tokens.tokenType as 'Bearer',
                 expiresIn: response.tokens.expiresIn,
              }
            : undefined,
      };
   }

   async checkEmail(email: string, correlationId?: string): Promise<{ available: boolean; email: string }> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() => this.authGrpcService.checkEmail({ email }, metadata)).pipe(
                  withGrpcRetry(this.authGrpcRetryPolicy),
               ),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async checkGrpcHealth(): Promise<IHealthCheckResponse> {
      try {
         const healthService = this.authGrpcClient.getService<IHealthGrpcService>(HEALTH_GRPC_SERVICE_NAME);
         return await firstValueFrom(healthService.check({ service: AUTH_V1_GRPC_SERVICE_NAME }));
      } catch {
         return { status: ServingStatus.NOT_SERVING };
      }
   }

   async getJwks(correlationId?: string): Promise<IJwksResponse> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() => this.authGrpcService.getJwks({}, metadata)).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
         return JSON.parse(response.keysJson) as IJwksResponse;
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async sendRegisterOtp(
      dto: SendRegisterOtpDto,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<SendRegisterOtpResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.sendRegisterOtp(
                     {
                        email: dto.email,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async verifyRegisterOtp(
      dto: VerifyRegisterOtpDto,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<VerifyRegisterOtpResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.verifyRegisterOtp(
                     {
                        email: dto.email,
                        otp: dto.otp,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async register(registerDto: RegisterDto, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<IAuthResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.register(
                     {
                        email: registerDto.email,
                        password: registerDto.password,
                        confirmPassword: registerDto.confirmPassword,
                        verificationToken: registerDto.verificationToken || '',
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
         return this.mapGrpcAuthResponse(response);
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async login(loginDto: LoginDto, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<IAuthResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.login(
                     {
                        email: loginDto.email,
                        password: loginDto.password,
                        ip: loginDto.ip,
                        deviceId: loginDto.deviceId,
                        clientType: loginDto.clientType,
                        appVersion: loginDto.appVersion,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });

         return this.mapGrpcAuthResponse(response);
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async refreshToken(refreshToken: string, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<IAuthResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.refreshToken(
                     {
                        refreshToken,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });

         return this.mapGrpcAuthResponse(response);
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getSessions(userId: string, currentJti?: string, correlationId?: string): Promise<IUserSessionInfo[]> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.getSessions(
                     {
                        userId,
                        currentJti,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });

         return (response.sessions || []).map((s): IUserSessionInfo => ({
            sessionId: s.sessionId,
            deviceType: s.deviceType || null,
            deviceName: s.deviceName || null,
            browser: s.browser || null,
            os: s.os || null,
            ipAddress: s.ipAddress || null,
            city: s.city || null,
            region: s.region || null,
            country: s.country || null,
            countryCode: s.countryCode || null,
            userAgent: s.userAgent || null,
            isCurrent: s.isCurrent,
            lastActiveAt: s.lastActiveAt,
            expiresAt: s.expiresAt,
            createdAt: s.createdAt,
         }));
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async revokeSession(
      userId: string,
      sessionId: string,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<void> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.revokeSession(
                     {
                        userId,
                        sessionId,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async revokeOtherSessions(
      userId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<IRevokeSessionResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.revokeOtherSessions(
                     {
                        userId,
                        currentJti,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
         return {
            success: response.success,
            revokedCount: response.revokedCount,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<void> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.revokeToken(
                     {
                        token,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async revokeAllUserTokens(userId: string, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<void> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.revokeAllUserTokens(
                     {
                        userId,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async logoutAll(userId: string, deviceInfo?: IDeviceInfo, correlationId?: string): Promise<void> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.logoutAll(
                     {
                        userId,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async changePassword(
      userId: string,
      changePasswordDto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<ChangePasswordResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.changePassword(
                     {
                        userId,
                        currentPassword: changePasswordDto.currentPassword,
                        newPassword: changePasswordDto.newPassword,
                        confirmPassword: changePasswordDto.confirmPassword,
                        logoutAll: changePasswordDto.logoutAll,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async verifyChangePasswordOtp(
      userId: string,
      dto: VerifyChangePasswordOtpDto,
      deviceInfo?: IDeviceInfo,
      correlationId?: string,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         return await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.verifyChangePasswordOtp(
                     {
                        userId,
                        otp: dto.otp,
                        deviceInfo: this.toProtoDeviceInfo(deviceInfo),
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async validateToken(token: string, correlationId?: string): Promise<IValidateTokenResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() => this.authGrpcService.validateToken({ token }, metadata)).pipe(
                  withGrpcRetry(this.authGrpcRetryPolicy),
               ),
            );
         });
         return {
            valid: response.valid,
            user: response.user
               ? {
                    userId: response.user.userId,
                    email: response.user.email,
                    roles: response.user.roles || [],
                    status: response.user.status,
                    isEmailVerified: response.user.isEmailVerified,
                    lastLoginAt: response.user.lastLoginAt || null,
                    createdAt: response.user.createdAt,
                    updatedAt: response.user.updatedAt,
                 }
               : ({} as IAuthUser),
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getUserAuditLogs(userId: string, page = 1, limit = 10, correlationId?: string): Promise<IAuditLogListResult> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() =>
                  this.authGrpcService.getUserAuditLogs(
                     {
                        userId,
                        page,
                        limit,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.authGrpcRetryPolicy)),
            );
         });

         return {
            data: (response.items || []).map((item): ISecurityAuditLog => ({
               auditLogId: item.auditLogId,
               accountId: item.userId || item.accountId || null,
               actorEmail: item.actorEmail || null,
               action: item.action,
               status: item.status,
               ipAddress: item.ipAddress || null,
               userAgent: item.userAgent || null,
               deviceType: item.deviceType || null,
               deviceName: item.deviceName || null,
               browser: item.browser || null,
               os: item.os || null,
               city: item.city || null,
               country: item.country || null,
               reason: item.reason || null,
               metadata: item.metadataJson ? (JSON.parse(item.metadataJson) as Record<string, unknown>) : null,
               createdAt: item.createdAt,
            })),
            total: response.total,
            page: response.page,
            limit: response.limit,
            totalPages: response.totalPages,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getEmail(accountId: string, correlationId?: string): Promise<UserEmailResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });
         const response = await this.authGrpcBreaker.execute(async () => {
            return await firstValueFrom(
               defer(() => this.authGrpcService.getEmail({ accountId }, metadata)).pipe(
                  withGrpcRetry(this.authGrpcRetryPolicy),
               ),
            );
         });
         return {
            accountId: response.accountId,
            email: response.email,
            isEmailVerified: true,
         };
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }
}
