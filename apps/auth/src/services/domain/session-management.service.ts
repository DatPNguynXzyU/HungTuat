import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, type IDeviceInfo } from '@common';
import {
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   AUTH_ERROR_CODES,
   type AuditStatus,
   type IRevokeSessionResult,
   type IUserSessionInfo,
} from '@contracts/auth';
import type { SessionEntity } from '@auth/entities/session.entity';
import { SESSION_REPOSITORY, type ISessionRepository } from '@auth/repositories';
import { AuditLogService, TOKEN_LIFECYCLE_SERVICE, type ITokenLifecycleService } from '@auth/services/infrastructure';
import { AuditLogBuilder } from '@auth/builders/audit-log.builder';
import {
   AUTH_DOMAIN_EVENTS,
   ActiveSessionsCountedEvent,
   SESSION_REVOKE_REASONS,
   SessionRevokeFailedEvent,
   SessionRevokedEvent,
   SessionsRevokedAllEvent,
   SessionsRevokedOthersEvent,
   type SessionRevokeReason,
} from '@auth/domain/events';
import { AUTH_METRICS_SESSION_OPERATIONS } from '@auth/constants';
import { SessionBelongsToAccountSpecification } from '@auth/domain/specifications';

@Injectable()
export class SessionManagementService {
   private readonly logger = new Logger(SessionManagementService.name);

   constructor(
      @Inject(SESSION_REPOSITORY)
      private readonly sessionRepository: ISessionRepository,
      @Inject(TOKEN_LIFECYCLE_SERVICE)
      private readonly tokenLifecycleService: ITokenLifecycleService,
      private readonly auditLogService: AuditLogService,
      private readonly eventEmitter: EventEmitter2,
      @Optional()
      private readonly sessionBelongsToAccountSpec: SessionBelongsToAccountSpecification = new SessionBelongsToAccountSpecification(),
   ) {}

   /**
    * Get all active sessions for an account
    */
   async getSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      const sessions: SessionEntity[] = (await this.sessionRepository.findActiveSessionsByAccountId(accountId)) || [];
      this.eventEmitter.emit(
         AUTH_DOMAIN_EVENTS.ACTIVE_SESSIONS_COUNTED,
         new ActiveSessionsCountedEvent(sessions.length),
      );
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
         if (!session) {
            throw new NotFoundException(AUTH_ERROR_CODES.SESSION_NOT_FOUND);
         }

         const ownershipValidation = this.sessionBelongsToAccountSpec.validate({ session, accountId });
         if (ownershipValidation.isFailure()) {
            throw new NotFoundException(ownershipValidation.getError());
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

         this.logger.log(`Session ${sessionId} revoked for account ${accountId}`);
      } catch (error) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.SESSION_REVOKE_FAILED,
            new SessionRevokeFailedEvent(accountId, AUTH_METRICS_SESSION_OPERATIONS.REVOKE, error),
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
            this.eventEmitter.emit(
               AUTH_DOMAIN_EVENTS.SESSIONS_REVOKED_OTHERS,
               new SessionsRevokedOthersEvent(accountId, currentJti, 0),
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

         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.SESSIONS_REVOKED_OTHERS,
            new SessionsRevokedOthersEvent(accountId, currentJti, revokedJtis.length),
         );
         this.logger.log(`Revoked ${revokedJtis.length} other sessions for account ${accountId}`);

         return { revokedCount: revokedJtis.length };
      } catch (error) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.SESSION_REVOKE_FAILED,
            new SessionRevokeFailedEvent(accountId, AUTH_METRICS_SESSION_OPERATIONS.REVOKE_OTHER, error),
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
         this.eventEmitter.emit(AUTH_DOMAIN_EVENTS.SESSIONS_REVOKED_ALL, new SessionsRevokedAllEvent(accountId));
         this.logger.log(`All sessions revoked for account ${accountId}`);
      } catch (error) {
         this.eventEmitter.emit(
            AUTH_DOMAIN_EVENTS.SESSION_REVOKE_FAILED,
            new SessionRevokeFailedEvent(accountId, AUTH_METRICS_SESSION_OPERATIONS.REVOKE_ALL, error),
         );
         throw error;
      }
   }

   /**
    * Map session entity to info DTO
    */
   private toSessionInfo(session: SessionEntity, currentJti?: string): IUserSessionInfo {
      return {
         sessionId: session.id,
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
      await this.auditLogService.record(
         AuditLogBuilder.create()
            .withAction(action)
            .withStatus(status)
            .withAccountId(accountId)
            .withDeviceInfo(deviceInfo)
            .withMetadata(metadata)
            .build(),
      );
   }
}
