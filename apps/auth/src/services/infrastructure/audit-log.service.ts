import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IAuditLogListResult, IAuditLogQuery } from '@contracts/auth';
import { AuditStatus } from '@auth/prisma-client';
import type { CreateAuditLogData, SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';
import { AuditLogBuilder } from '@auth/builders/audit-log.builder';
import type { IBuilder } from '@common';
import { AUDIT_LOG_REPOSITORY, type IAuditLogRepository } from '@auth/repositories/audit-log.repository.interface';
import { AUDIT_EVENT_STORE } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { IAuditEventStore } from '@auth/cqrs/write/audit-event-store.interface';
import {
   AccountSecurityScoreProjection,
   type AccountSecurityScoreResult,
   ThreatDetectionMetricsProjection,
   type ThreatMetrics,
} from '@auth/cqrs/read';
import {
   AuditProjectionRebuildService,
   type RebuildProjectionsOptions,
   type RebuildProjectionsResult,
} from '@auth/cqrs/services/audit-projection-rebuild.service';

function isBuilder(target: CreateAuditLogData | IBuilder<CreateAuditLogData>): target is IBuilder<CreateAuditLogData> {
   return typeof (target as IBuilder<CreateAuditLogData>).build === 'function';
}

@Injectable()
export class AuditLogService {
   private readonly logger = new Logger(AuditLogService.name);

   constructor(
      @Inject(AUDIT_EVENT_STORE)
      private readonly eventStore: IAuditEventStore,
      @Inject(AUDIT_LOG_REPOSITORY)
      private readonly auditLogRepository: IAuditLogRepository,
      private readonly securityScoreProjection: AccountSecurityScoreProjection,
      private readonly threatDetectionProjection: ThreatDetectionMetricsProjection,
      private readonly rebuildService: AuditProjectionRebuildService,
   ) {}

   /**
    * Command side: Writes immutable audit event to the append-only event store
    * and triggers asynchronous read model projections.
    * Accepts either raw CreateAuditLogData or an IBuilder<CreateAuditLogData> (e.g., AuditLogBuilder).
    */
   async record(
      builderOrData: CreateAuditLogData | IBuilder<CreateAuditLogData>,
   ): Promise<SecurityAuditLogEntity | null> {
      const data: CreateAuditLogData = isBuilder(builderOrData) ? builderOrData.build() : builderOrData;

      try {
         const event = await this.eventStore.appendEvent(data);
         const status = data.status === 'FAILURE' ? AuditStatus.FAILURE : AuditStatus.SUCCESS;

         return {
            id: event.eventId,
            accountId: data.accountId || null,
            actorEmail: data.actorEmail || null,
            action: data.action,
            status,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            deviceType: data.deviceType || null,
            deviceName: data.deviceName || null,
            browser: data.browser || null,
            os: data.os || null,
            city: data.city || null,
            country: data.country || null,
            reason: data.reason || null,
            metadata: data.metadata || null,
            createdAt: event.createdAt.toISOString(),
         };
      } catch (error) {
         this.logger.error(
            `Failed to record security audit log for action ${data.action} (actor: ${data.actorEmail || data.accountId || 'unknown'}): ${error instanceof Error ? error.message : String(error)}`,
         );
         return null;
      }
   }

   /**
    * Creates a new fluent AuditLogBuilder instance.
    */
   createBuilder(): AuditLogBuilder {
      return AuditLogBuilder.create();
   }

   /**
    * Query side: Retrieves paginated audit logs from the read-optimized projection.
    */
   async getAuditLogs(query: IAuditLogQuery): Promise<IAuditLogListResult> {
      return this.auditLogRepository.findAuditLogs(query);
   }

   /**
    * Query side: Retrieves an audit log by ID from the read-optimized projection.
    */
   async getAuditLogById(id: string): Promise<SecurityAuditLogEntity | null> {
      return this.auditLogRepository.findById(id);
   }

   /**
    * Query side: Retrieves account audit logs from the read-optimized projection.
    */
   async getAccountAuditLogs(accountId: string, page = 1, limit = 10): Promise<IAuditLogListResult> {
      return this.auditLogRepository.findAccountAuditLogs(accountId, page, limit);
   }

   /**
    * Query side: Retrieves real-time security score and risk level for an account.
    */
   async getSecurityScore(accountId: string): Promise<AccountSecurityScoreResult | null> {
      return this.securityScoreProjection.getScore(accountId);
   }

   /**
    * Query side: Retrieves threat detection metrics for today or a specific date.
    */
   async getThreatMetrics(date?: string): Promise<ThreatMetrics> {
      return date
         ? this.threatDetectionProjection.getMetricsByDate(date)
         : this.threatDetectionProjection.getTodayMetrics();
   }

   /**
    * Management: Rebuilds denormalized projections from the append-only event store.
    */
   async rebuildProjections(options?: RebuildProjectionsOptions): Promise<RebuildProjectionsResult> {
      return this.rebuildService.rebuildAll(options);
   }
}
