import { Inject, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@common';
import type { IDeviceInfo } from '@common';
import { AUDIT_ACTIONS, LoginDto, type IAuthResult } from '@contracts/auth';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';
import {
   AUTH_RATE_LIMITER,
   type IAuthRateLimiter,
   AuditLogService,
   PASSWORD_HASHER,
   type IPasswordHasher,
   TOKEN_LIFECYCLE_SERVICE,
   type ITokenLifecycleService,
} from '@auth/services/infrastructure';
import { AuthRedisKeys } from '@auth/constants';
import { LoginSaga } from '@auth/sagas';
import { AUTH_DOMAIN_EVENTS, LoginFailedEvent, LoginSuccessEvent } from '@auth/domain/events';
import { AuthRbacService } from '@auth/services/domain/auth-rbac.service';
import { AccountCanAuthenticateSpecification } from '@auth/domain/specifications';
import type { AccountEntity } from '@auth/entities';
import { AbstractAuthFlow, type AuthFlowContext, type AuthProvisionResult } from '@auth/templates';

import {
   LoginValidationPipeline,
   RateLimitHandler,
   LockoutHandler,
   AccountLookupHandler,
   PasswordVerificationHandler,
   AccountStatusHandler,
} from '@auth/chains/login-validation';

/**
 * AuthLoginService coordinates user login flow.
 * Implements the concrete Template Method operations derived from AbstractAuthFlow.
 */
@Injectable()
export class AuthLoginService extends AbstractAuthFlow<LoginDto, LoginSaga> {
   private readonly loginValidationPipeline: LoginValidationPipeline;

   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      private readonly authRbacService: AuthRbacService,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      tokenLifecycleService: ITokenLifecycleService,
      @Inject(PASSWORD_HASHER)
      private readonly passwordHasher: IPasswordHasher,
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
      private readonly redisService: RedisService,
      auditLogService: AuditLogService,
      eventEmitter: EventEmitter2,
      @Optional()
      private readonly accountCanAuthenticateSpec: AccountCanAuthenticateSpecification = new AccountCanAuthenticateSpecification(),
      @Optional()
      loginValidationPipeline?: LoginValidationPipeline,
   ) {
      super(tokenLifecycleService, auditLogService, eventEmitter);
      this.loginValidationPipeline =
         loginValidationPipeline ??
         new LoginValidationPipeline([
            new RateLimitHandler(this.rateLimiter),
            new LockoutHandler(this.redisService, this.auditLogService, this.eventEmitter),
            new AccountLookupHandler(
               this.accountRepository,
               this.redisService,
               this.auditLogService,
               this.eventEmitter,
            ),
            new PasswordVerificationHandler(
               this.passwordHasher,
               this.redisService,
               this.auditLogService,
               this.eventEmitter,
            ),
            new AccountStatusHandler(this.accountCanAuthenticateSpec, this.auditLogService, this.eventEmitter),
         ]);
   }

   /**
    * Public entry point for user authentication.
    * Executes the Template Method defined in AbstractAuthFlow.
    */
   async login(dto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.execute(dto, deviceInfo);
   }

   /**
    * Primitive step: Validates credentials via Chain of Responsibility and initializes LoginSaga.
    */
   protected async authenticateOrProvision(
      dto: LoginDto,
      deviceInfo?: IDeviceInfo,
   ): Promise<AuthProvisionResult<LoginSaga>> {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const clientIp = this.extractClientIp(dto, deviceInfo);
      const lockoutKey = AuthRedisKeys.lockout(normalizedEmail, clientIp);
      const failedAttemptsKey = AuthRedisKeys.failedAttempts(normalizedEmail, clientIp);

      const account = await this.loginValidationPipeline.validate({
         email: normalizedEmail,
         password: dto.password,
         clientIp,
         deviceInfo,
         lockoutKey,
         failedAttemptsKey,
      });

      const saga = new LoginSaga(this.tokenLifecycleService, this.accountRepository);
      saga.setAccount(account);

      return {
         account,
         saga,
         clientIp,
      };
   }

   /**
    * Hook: Resolves roles and warms the RBAC cache.
    */
   protected override async resolveRoles(account: AccountEntity): Promise<string[]> {
      const accountRoles = await super.resolveRoles(account);
      await Promise.all(accountRoles.map((role) => this.authRbacService.getOrCacheRole(role)));
      return accountRoles;
   }

   /**
    * Primitive step: Updates lastLoginAt in database and clears Redis attempt keys.
    */
   protected async onSuccess(context: AuthFlowContext<LoginDto, LoginSaga>): Promise<void> {
      const { account, saga, clientIp, dto } = context;
      const nowIso = new Date().toISOString();

      await this.accountRepository.update(account.id, { lastLoginAt: nowIso });
      saga.markDatabaseUpdated();
      context.lastLoginAt = nowIso;

      const normalizedEmail = dto.email.trim().toLowerCase();
      const lockoutKey = AuthRedisKeys.lockout(normalizedEmail, clientIp);
      const failedAttemptsKey = AuthRedisKeys.failedAttempts(normalizedEmail, clientIp);

      await Promise.all([this.redisService.del(failedAttemptsKey), this.redisService.del(lockoutKey)]).catch(
         (redisErr: unknown) => {
            this.logger.warn(`Failed to clear login attempt keys in Redis for ${normalizedEmail}`, redisErr);
         },
      );
   }

   /**
    * Hook: Identifies audit action for login success.
    */
   protected getAuditAction(): string {
      return AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS;
   }

   /**
    * Primitive step: Emits domain event for successful login.
    */
   protected emitSuccessEvent(context: AuthFlowContext<LoginDto, LoginSaga>): void {
      const durationSeconds = (Date.now() - context.startTime) / 1000;
      this.eventEmitter.emit(
         AUTH_DOMAIN_EVENTS.LOGIN_SUCCESS,
         new LoginSuccessEvent(
            context.account.id,
            context.account.email,
            new Date(),
            context.clientIp,
            context.deviceInfo,
            durationSeconds,
         ),
      );
   }

   /**
    * Primitive step: Emits domain event for failed login.
    */
   protected emitFailureEvent(error: unknown, dto: LoginDto, _deviceInfo?: IDeviceInfo, clientIp = 'unknown'): void {
      const reason = this.extractFailureReason(error);
      this.eventEmitter.emit(
         AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
         new LoginFailedEvent(dto.email, reason, new Date(), clientIp),
      );
   }
}
