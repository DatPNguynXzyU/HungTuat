import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   NotFoundException,
   type AuditStatus,
   type IDeviceInfo,
   type IRevokeSessionResult,
   type IUserSessionInfo,
} from '@common';
import type { SessionEntity } from '@auth/entities/session.entity';
import { SESSION_REPOSITORY, type ISessionRepository } from '@auth/repositories';
import { AuditLogService, TOKEN_LIFECYCLE_SERVICE, type ITokenLifecycleService } from '@auth/services/infrastructure';
import {
   AUTH_DOMAIN_EVENTS,
   SESSION_REVOKE_REASONS,
   SessionRevokedEvent,
   type SessionRevokeReason,
} from '@auth/domain/events';
import { AUTH_METRICS_SERVICE, type IAuthMetricsService } from '@auth/services/infrastructure';
import { AUTH_METRICS_SESSION_OPERATIONS, AUTH_METRICS_STATUS } from '@auth/constants';

@Injectable()
export class SessionManagementService {
   private readonly logger = new Logger(SessionManagementService.name);

   constructor(
      @Inject(SESSION_REPOSITORY)
      private readonly sessionRepository: ISessionRepository,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
      private readonly auditLogService: AuditLogService,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   /**
    * Get all active sessions for an account
    */
   async getSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      const sessions: SessionEntity[] = (await this.sessionRepository.findActiveSessionsByAccountId(accountId)) || [];
      this.metricsService.setActiveSessions(sessions.length);
      return sessions.map((session) => this.toSessionInfo(session, currentJti));
   }

   /**
    * Revoke a specific session
    */
   async revokeSession(
      accountId: string,
      sessionId: string,
      deviceInfo?: IDeviceInfo,
      reason: SessionRevokeReason = SESSION_REVOKE_REASONS.USER_ACTION,
   ): Promise<void> {
      try {
         // Get session and validate ownership
         const session: SessionEntity | null = await this.sessionRepository.findById(sessionId);
         if (!session || session.accountId !== accountId) {
            throw new NotFoundException(AUTH_ERROR_CODES.SESSION_NOT_FOUND);
         }

         if (session.isRevoked) {
            // Already revoked, idempotent return
            return;
         }

         // Revoke session in database, invalidate token in Redis, and record audit log in parallel
         await Promise.all([
            this.sessionRepository.revokeSession(sessionId, accountId),
            this.tokenLifecycleService.invalidateRefreshToken(accountId, session.refreshTokenJti),
            this.recordAuditLog(
               accountId,
               AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
               AUDIT_STATUS.SUCCESS,
               {
                  sessionId,
                  deviceType: session.deviceType,
                  browser: session.browser,
                  ipAddress: session.ipAddress,
               },
               deviceInfo,
            ),
         ]);

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.SESSION_REVOKED,
            new SessionRevokedEvent(accountId, sessionId, reason, new Date(), deviceInfo),
         );

         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`Session ${sessionId} revoked for account ${accountId}`);
      } catch (error) {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.FAILURE,
         );
         throw error;
      }
   }

   /**
    * Revoke all sessions except current
    */
   async revokeOtherSessions(
      accountId: string,
      currentJti: string,
      deviceInfo?: IDeviceInfo,
   ): Promise<IRevokeSessionResult> {
      try {
         const allSessions: SessionEntity[] =
            (await this.sessionRepository.findActiveSessionsByAccountId(accountId)) || [];
         const otherSessions = allSessions.filter((s) => s.refreshTokenJti !== currentJti);

         if (otherSessions.length === 0) {
            this.metricsService.recordSessionOperation(
               AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER,
               AUTH_METRICS_STATUS.SUCCESS,
            );
            return { revokedCount: 0 };
         }

         const revokedJtisResult: unknown = await this.sessionRepository.revokeOtherSessions(accountId, currentJti);
         const revokedJtis: string[] = Array.isArray(revokedJtisResult) ? (revokedJtisResult as string[]) : [];

         await Promise.all(revokedJtis.map((jti) => this.tokenLifecycleService.invalidateRefreshToken(accountId, jti)));

         this.recordAuditLog(
            accountId,
            AUDIT_ACTIONS.AUTH_SESSION_REVOKE_OTHERS,
            AUDIT_STATUS.SUCCESS,
            {
               revokedCount: revokedJtis.length,
               currentJti,
            },
            deviceInfo,
         ).catch((err: unknown) => {
            this.logger.error('Failed to record audit log (non-blocking)', err);
         });

         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER,
            AUTH_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`Revoked ${revokedJtis.length} other sessions for account ${accountId}`);

         return { revokedCount: revokedJtis.length };
      } catch (error) {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER,
            AUTH_METRICS_STATUS.FAILURE,
         );
         throw error;
      }
   }

   /**
    * Revoke all sessions for an account
    */
   async revokeAllAccountSessions(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      try {
         await this.tokenLifecycleService.logoutAll(accountId);
         await this.recordAuditLog(
            accountId,
            AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
            AUDIT_STATUS.SUCCESS,
            { accountId },
            deviceInfo,
         );
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL,
            AUTH_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`All sessions revoked for account ${accountId}`);
      } catch (error) {
         this.metricsService.recordSessionOperation(
            AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL,
            AUTH_METRICS_STATUS.FAILURE,
         );
         throw error;
      }
   }

   /**
    * Map session entity to info DTO
    */
   private toSessionInfo(session: SessionEntity, currentJti?: string): IUserSessionInfo {
      return {
         id: session.id,
         deviceType: session.deviceType,
         deviceName: session.deviceName,
         browser: session.browser,
         os: session.os,
         ipAddress: session.ipAddress,
         city: session.city,
         region: session.region,
         country: session.country,
         countryCode: session.countryCode,
         userAgent: session.userAgent,
         isCurrent: Boolean(currentJti && session.refreshTokenJti === currentJti),
         lastActiveAt: session.lastActiveAt,
         expiresAt: session.expiresAt,
         createdAt: session.createdAt,
      };
   }

   /**
    * Record audit log helper
    */
   private async recordAuditLog(
      accountId: string,
      action: string,
      status: AuditStatus,
      metadata: Record<string, unknown>,
      deviceInfo?: IDeviceInfo,
   ): Promise<void> {
      await this.auditLogService.record({
         accountId,
         action,
         status,
         ipAddress: deviceInfo?.ipAddress,
         userAgent: deviceInfo?.userAgent,
         deviceType: deviceInfo?.deviceType,
         deviceName: deviceInfo?.deviceName,
         browser: deviceInfo?.browser,
         os: deviceInfo?.os,
         city: deviceInfo?.city,
         country: deviceInfo?.country,
         metadata,
      });
   }
}
