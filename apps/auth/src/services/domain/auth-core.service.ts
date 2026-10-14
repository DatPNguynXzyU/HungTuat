import type { IJwtService, ITokenLifecycleService } from '@auth/services/infrastructure';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   AUTH_SECURITY,
   DEFAULT_ROLES,
   NotFoundException,
   RbacCacheService,
   REDIS_TTL,
   RedisService,
   UnauthorizedException,
   USER_STATUS,
} from '@common';
import type {
   IDeviceInfo,
   IAuthResult,
   IValidateTokenResult,
   IJwksResponse,
   LoginDto,
   UserEmailResponseDto,
} from '@common';
import { ACCOUNT_REPOSITORY, type IAccountRepository, RBAC_REPOSITORY, type IRbacRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import {
   AUTH_METRICS_SERVICE,
   type IAuthMetricsService,
   AUTH_RATE_LIMITER,
   type IAuthRateLimiter,
   AuditLogService,
   JWT_SERVICE,
   PASSWORD_HASHER,
   type IPasswordHasher,
   TOKEN_LIFECYCLE_SERVICE,
} from '@auth/services/infrastructure';
import {
   AUTH_METRICS_REASONS,
   AUTH_METRICS_STATUS,
   AUTH_METRICS_TOKEN_OPERATIONS,
   AuthMetricReason,
   AuthRedisKeys,
} from '@auth/constants';
import type { RoleEntity } from '@auth/entities';
import { LoginSaga } from '@auth/sagas';
import { AUTH_DOMAIN_EVENTS, AccountLockedEvent, LoginFailedEvent, LoginSuccessEvent } from '@auth/domain/events';

@Injectable()
export class AuthCoreService {
   private readonly logger = new Logger(AuthCoreService.name);

   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      @Inject(RBAC_REPOSITORY)
      private readonly rbacRepository: IRbacRepository,
      private readonly rbacCacheService: RbacCacheService,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      @Inject(JWT_SERVICE)
      private readonly jwtService: IJwtService,
      @Inject(PASSWORD_HASHER)
      private readonly passwordHasher: IPasswordHasher,
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
      private readonly redisService: RedisService,
      private readonly auditLogService: AuditLogService,
      private readonly config: AuthConfigService,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   getJwks(): IJwksResponse {
      return this.jwtService.getJwks();
   }

   private async getOrCacheRole(roleCode: string): Promise<RoleEntity | null> {
      const cached = await this.rbacCacheService.getRole(roleCode);
      if (cached) {
         return cached;
      }

      const role = await this.rbacRepository.findRoleByCode(roleCode);
      if (role) {
         await this.rbacCacheService.setRole(roleCode, {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
         });
      }

      return role;
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      const role = await this.getOrCacheRole(roleCode);
      return role?.permissions || [];
   }

   private async handleFailedLoginAttempt(
      lockoutKey: string,
      failedAttemptsKey: string,
      email: string,
      ip: string,
      deviceInfo?: IDeviceInfo,
      accountId?: string,
   ): Promise<void> {
      const attempts = await this.redisService.incr(failedAttemptsKey);
      if (attempts === 1) {
         await this.redisService.expire(failedAttemptsKey, REDIS_TTL.AUTH_FAILED_ATTEMPTS);
      }

      if (attempts >= AUTH_SECURITY.MAX_FAILED_LOGIN_ATTEMPTS) {
         await Promise.all([
            this.redisService.set(lockoutKey, 'locked', REDIS_TTL.AUTH_LOCKOUT),
            this.redisService.del(failedAttemptsKey),
         ]);
         this.logger.warn(
            `Account ${email} temporarily locked for IP ${ip} after ${attempts} consecutive failed attempts.`,
         );

         await this.auditLogService.record({
            accountId: accountId || null,
            actorEmail: email,
            action: AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED,
            status: AUDIT_STATUS.FAILURE,
            ipAddress: ip,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
            reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
            metadata: { consecutiveFailedAttempts: attempts, lockoutSeconds: REDIS_TTL.AUTH_LOCKOUT },
         });

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.ACCOUNT_LOCKED,
            new AccountLockedEvent(
               accountId || null,
               email,
               ip,
               AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
               new Date(Date.now() + REDIS_TTL.AUTH_LOCKOUT * 1000),
               attempts,
            ),
         );

         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
            params: {
               email,
               ip,
               remainingSeconds: REDIS_TTL.AUTH_LOCKOUT,
               remainingMinutes: Math.ceil(REDIS_TTL.AUTH_LOCKOUT / 60),
            },
         });
      }
   }

   async login(dto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      const startTime = this.metricsService.startTimer();
      let saga: LoginSaga | null = null;

      try {
         const normalizedEmail = dto.email.trim().toLowerCase();
         const clientIp = deviceInfo?.ipAddress || dto.ip?.trim() || 'unknown';

         await this.rateLimiter.checkLogin(normalizedEmail, clientIp);

         const lockoutKey = AuthRedisKeys.lockout(normalizedEmail, clientIp);
         const failedAttemptsKey = AuthRedisKeys.failedAttempts(normalizedEmail, clientIp);

         const isLocked = await this.redisService.get(lockoutKey);
         if (isLocked) {
            const remainingSeconds = await this.redisService.ttl(lockoutKey);
            const remainingMinutes = Math.max(
               Math.ceil((remainingSeconds > 0 ? remainingSeconds : REDIS_TTL.AUTH_LOCKOUT) / 60),
               1,
            );

            await this.auditLogService.record({
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
               metadata: { remainingSeconds },
            });

            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
               new LoginFailedEvent(normalizedEmail, AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, new Date(), clientIp),
            );

            throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
               params: {
                  email: normalizedEmail,
                  ip: clientIp,
                  remainingSeconds: remainingSeconds > 0 ? remainingSeconds : REDIS_TTL.AUTH_LOCKOUT,
                  remainingMinutes,
               },
            });
         }

         const account = await this.accountRepository.findByEmail(normalizedEmail);
         if (!account) {
            await this.auditLogService.record({
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            });
            await this.handleFailedLoginAttempt(lockoutKey, failedAttemptsKey, normalizedEmail, clientIp, deviceInfo);
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
               new LoginFailedEvent(normalizedEmail, AUTH_ERROR_CODES.INVALID_CREDENTIALS, new Date(), clientIp),
            );
            throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
         }

         const isValid = await this.passwordHasher.verify(account.passwordHash, dto.password);
         if (!isValid) {
            await this.auditLogService.record({
               accountId: account.id,
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            });
            await this.handleFailedLoginAttempt(
               lockoutKey,
               failedAttemptsKey,
               normalizedEmail,
               clientIp,
               deviceInfo,
               account.id,
            );
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
               new LoginFailedEvent(normalizedEmail, AUTH_ERROR_CODES.INVALID_CREDENTIALS, new Date(), clientIp),
            );
            throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
         }

         if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
            await this.auditLogService.record({
               accountId: account.id,
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               reason: AUTH_ERROR_CODES.ACCOUNT_BLOCKED,
            });
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
               new LoginFailedEvent(normalizedEmail, AUTH_ERROR_CODES.ACCOUNT_BLOCKED, new Date(), clientIp),
            );
            throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
         }

         if (account.status === USER_STATUS.INACTIVE) {
            await this.auditLogService.record({
               accountId: account.id,
               actorEmail: normalizedEmail,
               action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
               status: AUDIT_STATUS.FAILURE,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               reason: AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
            });
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.LOGIN_FAILED,
               new LoginFailedEvent(normalizedEmail, AUTH_ERROR_CODES.ACCOUNT_INACTIVE, new Date(), clientIp),
            );
            throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
         }

         saga = new LoginSaga(this.tokenLifecycleService, this.accountRepository);
         saga.setAccount(account);

         const accountRoles = account.roles && account.roles.length > 0 ? account.roles : [DEFAULT_ROLES.USER];
         await Promise.all(accountRoles.map((role) => this.getOrCacheRole(role)));

         // Generate tokens FIRST (fail fast)
         const tokens = await this.tokenLifecycleService.generateTokenPair(
            {
               id: account.id,
               email: account.email,
               roles: accountRoles,
            },
            deviceInfo,
         );
         saga.setTokens(tokens);

         // Update database with rollback capability
         const nowIso = new Date().toISOString();
         await this.accountRepository.update(account.id, { lastLoginAt: nowIso });
         saga.markDatabaseUpdated();

         // Clear Redis failed attempts and lockout (best effort)
         await Promise.all([this.redisService.del(failedAttemptsKey), this.redisService.del(lockoutKey)]).catch(
            (redisErr: unknown) => {
               this.logger.warn(`Failed to clear login attempt keys in Redis for ${normalizedEmail}`, redisErr);
            },
         );

         // Audit log (fire-and-forget, non-blocking)
         this.auditLogService
            .record({
               accountId: account.id,
               actorEmail: account.email,
               action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
               status: AUDIT_STATUS.SUCCESS,
               ipAddress: clientIp,
               userAgent: deviceInfo?.userAgent,
               deviceType: deviceInfo?.deviceType,
               deviceName: deviceInfo?.deviceName,
               browser: deviceInfo?.browser,
               os: deviceInfo?.os,
               city: deviceInfo?.city,
               country: deviceInfo?.country,
               metadata: { roles: accountRoles },
            })
            .catch((err: unknown) => {
               this.logger.error('Failed to record login audit log (non-blocking)', err);
            });

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.LOGIN_SUCCESS,
            new LoginSuccessEvent(account.id, account.email, new Date(), clientIp, deviceInfo),
         );

         this.metricsService.recordLoginAttempt(AUTH_METRICS_STATUS.SUCCESS);
         this.metricsService.observeLoginDuration(this.metricsService.calculateDuration(startTime));

         return {
            user: {
               id: account.id,
               email: account.email,
               roles: accountRoles,
               status: account.status || USER_STATUS.ACTIVE,
               isEmailVerified: account.isEmailVerified ?? false,
               lastLoginAt: nowIso,
               createdAt: account.createdAt,
               updatedAt: account.updatedAt,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
         };
      } catch (error) {
         if (saga) {
            await saga.rollback();
         }
         let reason: AuthMetricReason = AUTH_METRICS_REASONS.UNKNOWN;
         if (error instanceof UnauthorizedException) {
            const errCode = (error as { errorCode?: string }).errorCode;
            if (errCode === AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY) {
               reason = AUTH_METRICS_REASONS.ACCOUNT_LOCKED;
            } else {
               reason = AUTH_METRICS_REASONS.INVALID_CREDENTIALS;
            }
         }
         this.metricsService.recordLoginAttempt(AUTH_METRICS_STATUS.FAILURE, reason);
         throw error;
      }
   }

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      try {
         const payload = await this.tokenLifecycleService.validateRefreshToken(token);

         await this.rateLimiter.checkRefreshToken(payload.sub);

         const account = await this.accountRepository.findById(payload.sub);
         if (!account) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
         }

         if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
            await this.tokenLifecycleService.logoutAll(account.id);
            throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
         }

         if (account.status === USER_STATUS.INACTIVE) {
            await this.tokenLifecycleService.logoutAll(account.id);
            throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
         }

         const accountRoles =
            account.roles && account.roles.length > 0 ? account.roles : payload.roles || [DEFAULT_ROLES.USER];

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

         await this.auditLogService.record({
            accountId: account.id,
            actorEmail: account.email,
            action: AUDIT_ACTIONS.AUTH_TOKEN_REFRESH,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
         });

         return {
            user: {
               id: account.id,
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
      } catch (error) {
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REFRESH, AUTH_METRICS_STATUS.FAILURE);
         throw error;
      }
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      try {
         await this.tokenLifecycleService.revokeToken(token);
         await this.auditLogService.record({
            action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress: deviceInfo?.ipAddress,
            userAgent: deviceInfo?.userAgent,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            city: deviceInfo?.city,
            country: deviceInfo?.country,
         });
      } catch (error) {
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REVOKE, AUTH_METRICS_STATUS.FAILURE);
         throw error;
      }
   }

   async revokeAllAccountTokens(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenLifecycleService.revokeAllAccountTokens(accountId);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
      });
   }

   async logoutAll(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      await this.tokenLifecycleService.logoutAll(accountId);
      await this.auditLogService.record({
         accountId,
         action: AUDIT_ACTIONS.AUTH_LOGOUT_ALL,
         status: AUDIT_STATUS.SUCCESS,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
      });
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      const payload = await this.tokenLifecycleService.validateAccessToken(token);

      const account = await this.accountRepository.findById(payload.sub);
      if (!account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.USER_NOT_FOUND);
      }

      if (account.status === USER_STATUS.BLOCKED || account.status === USER_STATUS.SUSPENDED) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_BLOCKED);
      }

      if (account.status === USER_STATUS.INACTIVE) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.ACCOUNT_INACTIVE);
      }

      const accountRoles =
         account.roles && account.roles.length > 0 ? account.roles : payload.roles || [DEFAULT_ROLES.USER];

      return {
         valid: true,
         user: {
            id: account.id,
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

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      const account = await this.accountRepository.findEmailById(accountId);
      if (!account) {
         throw new NotFoundException(AUTH_ERROR_CODES.USER_NOT_FOUND, {
            params: { id: accountId },
         });
      }

      return {
         id: account.id,
         email: account.email,
         isEmailVerified: account.isEmailVerified,
      };
   }
}
