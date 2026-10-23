import { Inject, Injectable, Optional } from '@nestjs/common';
import { SYSTEM_ROLES, UnauthorizedException, type IDeviceInfo } from '@common';
import {
   AUDIT_ACTIONS,
   AUTH_ERROR_CODES,
   USER_STATUS,
   type IAuthResult,
   type IValidateTokenResult,
} from '@contracts/auth';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';
import {
   AUTH_RATE_LIMITER,
   type IAuthRateLimiter,
   AuditLogService,
   TOKEN_LIFECYCLE_SERVICE,
   type ITokenLifecycleService,
} from '@auth/services/infrastructure';
import { AuditLogBuilder } from '@auth/builders/audit-log.builder';
import { AccountCanAuthenticateSpecification } from '@auth/domain/specifications';

@Injectable()
export class AuthTokenService {
   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
      private readonly auditLogService: AuditLogService,
      @Optional()
      private readonly accountCanAuthenticateSpec: AccountCanAuthenticateSpecification = new AccountCanAuthenticateSpecification(),
   ) {}

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const payload = await this.tokenLifecycleService.validateRefreshToken(token);

      await this.rateLimiter.checkRefreshToken(payload.sub);

      const account = await this.accountRepository.findById(payload.sub);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const authValidation = this.accountCanAuthenticateSpec.validate(account);
      if (authValidation.isFailure()) {
         await this.tokenLifecycleService.logoutAll(account.id);
         throw new UnauthorizedException(authValidation.getError());
      }

      const accountRoles =
         account.roles && account.roles.length > 0 ? account.roles : payload.roles || [SYSTEM_ROLES.USER];

      const nowInSeconds = Math.floor(Date.now() / 1000);
      const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : undefined;

      const { accessToken, refreshToken: newRefreshToken } = await this.tokenLifecycleService.rotateTokenPair(
         {
            id: account.id,
            email: account.email,
            roles: accountRoles,
         },
         payload.jti as string,
         deviceInfo,
         remainingTtl,
      );

      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_TOKEN_REFRESH)
            .asSuccess()
            .withAccount(account)
            .withDeviceInfo(deviceInfo)
            .build(),
      );

      return {
         user: {
            userId: account.id,
            email: account.email,
            roles: accountRoles,
            status: account.status || USER_STATUS.ACTIVE,
            isEmailVerified: account.isEmailVerified ?? false,
            lastLoginAt: account.lastLoginAt ?? null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
         },
         accessToken,
         refreshToken: newRefreshToken,
      };
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenLifecycleService.revokeToken(token);
      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_TOKEN_REVOKE)
            .asSuccess()
            .withDeviceInfo(deviceInfo)
            .build(),
      );
   }

   async revokeAllAccountTokens(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenLifecycleService.revokeAllAccountTokens(accountId);
      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_TOKEN_REVOKE)
            .asSuccess()
            .withAccountId(accountId)
            .withDeviceInfo(deviceInfo)
            .build(),
      );
   }

   async logoutAll(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenLifecycleService.logoutAll(accountId);
      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(AUDIT_ACTIONS.AUTH_LOGOUT_ALL)
            .asSuccess()
            .withAccountId(accountId)
            .withDeviceInfo(deviceInfo)
            .build(),
      );
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      const payload = await this.tokenLifecycleService.validateAccessToken(token);

      const account = await this.accountRepository.findById(payload.sub);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      const authValidation = this.accountCanAuthenticateSpec.validate(account);
      if (authValidation.isFailure()) {
         throw new UnauthorizedException(authValidation.getError());
      }

      const accountRoles =
         account.roles && account.roles.length > 0 ? account.roles : payload.roles || [SYSTEM_ROLES.USER];

      return {
         valid: true,
         user: {
            userId: account.id,
            email: account.email,
            roles: accountRoles,
            status: account.status || USER_STATUS.ACTIVE,
            isEmailVerified: account.isEmailVerified ?? false,
            lastLoginAt: account.lastLoginAt ?? null,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
         },
      };
   }
}
