import { Inject, Injectable, Logger } from '@nestjs/common';
import { AUDIT_EVENT_STORE } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { IAuditEventStore } from '@auth/cqrs/write/audit-event-store.interface';
import {
   AccountSecurityScoreProjection,
   SecurityAuditLogProjection,
   ThreatDetectionMetricsProjection,
} from '@auth/cqrs/read';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

export interface RebuildProjectionsOptions {
   batchSize?: number;
   fromVersion?: number;
}

export interface RebuildProjectionsResult {
   replayedCount: number;
   durationMs: number;
}

@Injectable()
export class AuditProjectionRebuildService {
   private readonly logger = new Logger(AuditProjectionRebuildService.name);

   constructor(
      @Inject(AUDIT_EVENT_STORE)
      private readonly eventStore: IAuditEventStore,
      private readonly securityAuditLogProjection: SecurityAuditLogProjection,
      private readonly securityScoreProjection: AccountSecurityScoreProjection,
      private readonly threatDetectionProjection: ThreatDetectionMetricsProjection,
   ) {}

   async rebuildAll(options: RebuildProjectionsOptions = {}): Promise<RebuildProjectionsResult> {
      const startTime = Date.now();
      const batchSize = Math.max(options.batchSize || 100, 1);
      let fromVersion = options.fromVersion ?? 0;
      let totalReplayed = 0;

      this.logger.log(`Starting audit projection rebuild from version ${fromVersion}...`);

      while (true) {
         const events = await this.eventStore.getAllEvents({
            fromVersion,
            take: batchSize,
         });

         if (events.length === 0) {
            break;
         }

         for (const event of events) {
            const auditData = event.data as unknown as CreateAuditLogData;
            const logData: CreateAuditLogData = {
               ...auditData,
               id: event.eventId,
               createdAt: event.createdAt.toISOString(),
            };

            await Promise.allSettled([
               this.securityAuditLogProjection.project(logData),
               this.securityScoreProjection.project(logData),
               this.threatDetectionProjection.project(logData),
            ]);

            totalReplayed++;
            fromVersion = event.version + 1;
         }

         if (events.length < batchSize) {
            break;
         }
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`Completed audit projection rebuild: ${totalReplayed} events in ${durationMs}ms`);

      return {
         replayedCount: totalReplayed,
         durationMs,
      };
   }
}
