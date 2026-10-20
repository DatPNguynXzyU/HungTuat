import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ClientProxy, type ClientGrpc } from '@nestjs/microservices';
import {
   CircuitBreakerRegistry,
   createGrpcMetadata,
   handleGrpcError,
   IDeviceInfo,
   RetryPolicyRegistry,
   SERVICE_NAMES,
   SERVICES,
   withGrpcRetry,
} from '@common';
import {
   HEALTH_GRPC_SERVICE_NAME,
   ServingStatus,
   type IHealthCheckResponse,
   type IHealthGrpcService,
} from '@contracts/health';
import {
   AUTH_PATTERNS,
   AUTH_V1_GRPC_CLIENT,
   AUTH_V1_GRPC_SERVICE_NAME,
   type IAuthV1GrpcService,
   ChangePasswordDto,
   ChangePasswordResponseDto,
   IAuditLogListResult,
   IAuthResult,
   IJwksResponse,
   IRevokeSessionResult,
   IRevokeTokenResult,
   IUserSessionInfo,
   IValidateTokenResult,
   LoginDto,
   RegisterDto,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   UserEmailResponseDto,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
} from '@contracts/auth';
import { defer, firstValueFrom } from 'rxjs';

export type AuthResponseData = IAuthResult;
export type ValidateTokenResponse = IValidateTokenResult;
export type RevokeTokenResponse = IRevokeTokenResult;

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

   constructor(
      @Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientProxy,
      @Inject(AUTH_V1_GRPC_CLIENT) private readonly authGrpcClient: ClientGrpc,
   ) {}

   onModuleInit(): void {
      this.authGrpcService = this.authGrpcClient.getService<IAuthV1GrpcService>(AUTH_V1_GRPC_SERVICE_NAME);
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

   async getJwks(): Promise<IJwksResponse> {
      return firstValueFrom(
         this.authClient.send<IJwksResponse, Record<string, never>>({ cmd: AUTH_PATTERNS.GET_JWKS }, {}),
      );
   }

   async sendRegisterOtp(dto: SendRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<SendRegisterOtpResponseDto> {
      return firstValueFrom(
         this.authClient.send<SendRegisterOtpResponseDto, SendRegisterOtpDto & { deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.SEND_REGISTER_OTP },
            { ...dto, deviceInfo },
         ),
      );
   }

   async verifyRegisterOtp(dto: VerifyRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<VerifyRegisterOtpResponseDto> {
      return firstValueFrom(
         this.authClient.send<VerifyRegisterOtpResponseDto, VerifyRegisterOtpDto & { deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.VERIFY_REGISTER_OTP },
            { ...dto, deviceInfo },
         ),
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

   async revokeSession(userId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return firstValueFrom(
         this.authClient.send<void, { userId: string; sessionId: string; deviceInfo?: IDeviceInfo }>(
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

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return firstValueFrom(
         this.authClient.send<void, { token: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_TOKEN },
            { token, deviceInfo },
         ),
      );
   }

   async revokeAllUserTokens(userId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return firstValueFrom(
         this.authClient.send<void, { userId: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.REVOKE_ALL_USER_TOKENS },
            { userId, deviceInfo },
         ),
      );
   }

   async logoutAll(userId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return firstValueFrom(
         this.authClient.send<void, { userId: string; deviceInfo?: IDeviceInfo }>(
            { cmd: AUTH_PATTERNS.LOGOUT_ALL },
            { userId, deviceInfo },
         ),
      );
   }

   async changePassword(
      userId: string,
      changePasswordDto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<ChangePasswordResponseDto> {
      return firstValueFrom(
         this.authClient.send<
            ChangePasswordResponseDto,
            { userId: string; changePasswordDto: ChangePasswordDto; deviceInfo?: IDeviceInfo }
         >({ cmd: AUTH_PATTERNS.CHANGE_PASSWORD }, { userId, changePasswordDto, deviceInfo }),
      );
   }

   async verifyChangePasswordOtp(
      userId: string,
      dto: VerifyChangePasswordOtpDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      return firstValueFrom(
         this.authClient.send<
            VerifyChangePasswordOtpResponseDto,
            { userId: string; dto: VerifyChangePasswordOtpDto; deviceInfo?: IDeviceInfo }
         >({ cmd: AUTH_PATTERNS.VERIFY_CHANGE_PASSWORD_OTP }, { userId, dto, deviceInfo }),
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

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      return firstValueFrom(
         this.authClient.send<UserEmailResponseDto, { accountId: string }>(
            { cmd: AUTH_PATTERNS.GET_EMAIL },
            { accountId },
         ),
      );
   }
}
