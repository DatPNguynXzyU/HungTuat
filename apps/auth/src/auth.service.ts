import type { ITokenService } from '@auth/services/infrastructure';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RbacCacheService, RedisService, SERVICES } from '@common';
import type {
   IDeviceInfo,
   IAuthResult,
   IUserSessionInfo,
   IRevokeSessionResult,
   IValidateTokenResult,
   IJwksResponse,
   LoginDto,
   RegisterDto,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
   ChangePasswordDto,
   ChangePasswordResponseDto,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
   UserEmailResponseDto,
} from '@common';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { OutboxPublisherService } from '@auth/outbox';
import { AuditLogService, EmailBloomFilterService, TOKEN_SERVICE } from '@auth/services/infrastructure';
import {
   AuthCoreService,
   AuthRegistrationService,
   SessionManagementService,
   PasswordManagementService,
} from '@auth/services/domain';

/**
 * @deprecated Legacy monolithic AuthService facade. Use domain services directly:
 * - AuthCoreService (@auth/services/domain)
 * - AuthRegistrationService (@auth/services/domain)
 * - SessionManagementService (@auth/services/domain)
 * - PasswordManagementService (@auth/services/domain)
 * Kept for 1 sprint for backwards compatibility.
 */
@Injectable()
export class AuthService {
   private readonly coreService: AuthCoreService;
   private readonly registrationService: AuthRegistrationService;
   private readonly sessionService: SessionManagementService;
   private readonly passwordService: PasswordManagementService;

   constructor(
      @Inject(AUTH_REPOSITORY)
      private readonly authRepository: AuthRepository,
      private readonly rbacCacheService: RbacCacheService,
      @Inject(TOKEN_SERVICE)
      private readonly tokenService: ITokenService,
      private readonly outboxPublisherService: OutboxPublisherService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      private readonly emailBloomFilterService: EmailBloomFilterService,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly config: AuthConfigService,
      @Optional() authCoreService?: AuthCoreService,
      @Optional() authRegistrationService?: AuthRegistrationService,
      @Optional() sessionManagementService?: SessionManagementService,
      @Optional() passwordManagementService?: PasswordManagementService,
   ) {
      this.coreService =
         authCoreService ||
         new AuthCoreService(
            this.authRepository,
            this.rbacCacheService,
            this.tokenService,
            this.redisService,
            this.auditLogService,
            this.config,
         );
      this.registrationService =
         authRegistrationService ||
         new AuthRegistrationService(
            this.authRepository,
            this.rbacCacheService,
            this.tokenService,
            this.emailBloomFilterService,
            this.outboxPublisherService,
            this.redisService,
            this.auditLogService,
            this.notificationClient,
            this.config,
         );
      this.sessionService =
         sessionManagementService || new SessionManagementService(this.tokenService, this.auditLogService);
      this.passwordService =
         passwordManagementService ||
         new PasswordManagementService(
            this.authRepository,
            this.tokenService,
            this.redisService,
            this.auditLogService,
            this.notificationClient,
            this.config,
         );
   }

   getJwks(): IJwksResponse {
      return this.coreService.getJwks();
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      return this.coreService.getRolePermissions(roleCode);
   }

   async checkEmail(email: string): Promise<{ available: boolean; email: string }> {
      return this.registrationService.checkEmail(email);
   }

   async sendRegisterOtp(dto: SendRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<SendRegisterOtpResponseDto> {
      return this.registrationService.sendRegisterOtp(dto, deviceInfo);
   }

   async verifyRegisterOtp(dto: VerifyRegisterOtpDto, deviceInfo?: IDeviceInfo): Promise<VerifyRegisterOtpResponseDto> {
      return this.registrationService.verifyRegisterOtp(dto, deviceInfo);
   }

   async register(dto: RegisterDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.registrationService.register(dto, deviceInfo);
   }

   async login(dto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.coreService.login(dto, deviceInfo);
   }

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.coreService.refreshToken(token, deviceInfo);
   }

   async getSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      return this.sessionService.getSessions(accountId, currentJti);
   }

   async revokeSession(accountId: string, sessionId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.sessionService.revokeSession(accountId, sessionId, deviceInfo);
   }

   async revokeOtherSessions(
      accountId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      return this.sessionService.revokeOtherSessions(accountId, currentJti, deviceInfo);
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.coreService.revokeToken(token, deviceInfo);
   }

   async revokeAllAccountTokens(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.coreService.revokeAllAccountTokens(accountId, deviceInfo);
   }

   async logoutAll(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.coreService.logoutAll(accountId, deviceInfo);
   }

   async changePassword(
      accountId: string,
      dto: ChangePasswordDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<ChangePasswordResponseDto> {
      return this.passwordService.changePassword(accountId, dto, deviceInfo);
   }

   async verifyChangePasswordOtp(
      accountId: string,
      dto: VerifyChangePasswordOtpDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      return this.passwordService.verifyChangePasswordOtp(accountId, dto, deviceInfo);
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      return this.coreService.validateToken(token);
   }

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      return this.coreService.getEmail(accountId);
   }
}
