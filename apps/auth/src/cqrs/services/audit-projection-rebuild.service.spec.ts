import { Test, type TestingModule } from '@nestjs/testing';
import { AuditProjectionRebuildService } from '@auth/cqrs/services/audit-projection-rebuild.service';
import { AUDIT_EVENT_STORE } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { IAuditEventStore } from '@auth/cqrs/write/audit-event-store.interface';
import {
   AccountSecurityScoreProjection,
   SecurityAuditLogProjection,
   ThreatDetectionMetricsProjection,
} from '@auth/cqrs/read';
import { AuditStatus } from '@auth/prisma-client';
import { AUDIT_ACTIONS } from '@contracts/auth';

describe('AuditProjectionRebuildService', () => {
   let service: AuditProjectionRebuildService;
   let eventStore: jest.Mocked<IAuditEventStore>;
   let securityAuditLogProjection: { project: jest.Mock };
   let securityScoreProjection: { project: jest.Mock };
   let threatDetectionProjection: { project: jest.Mock };

   beforeEach(async () => {
      eventStore = {
         appendEvent: jest.fn(),
         getStream: jest.fn(),
         getAllEvents: jest.fn(),
         countEvents: jest.fn(),
      };

      securityAuditLogProjection = { project: jest.fn().mockResolvedValue(null) };
      securityScoreProjection = { project: jest.fn().mockResolvedValue(null) };
      threatDetectionProjection = { project: jest.fn().mockResolvedValue(undefined) };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditProjectionRebuildService,
            { provide: AUDIT_EVENT_STORE, useValue: eventStore },
            { provide: SecurityAuditLogProjection, useValue: securityAuditLogProjection },
            { provide: AccountSecurityScoreProjection, useValue: securityScoreProjection },
            { provide: ThreatDetectionMetricsProjection, useValue: threatDetectionProjection },
         ],
      }).compile();

      service = module.get<AuditProjectionRebuildService>(AuditProjectionRebuildService);
   });

   it('should replay events through all projections and return summary', async () => {
      const now = new Date();
      const mockEvents = [
         {
            eventId: 'event-1',
            streamId: 'audit-acc-1',
            eventType: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            version: 1,
            data: { accountId: 'acc-1', action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS, status: AuditStatus.SUCCESS },
            metadata: { timestamp: now.toISOString() },
            createdAt: now,
         },
         {
            eventId: 'event-2',
            streamId: 'audit-acc-1',
            eventType: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            version: 2,
            data: { accountId: 'acc-1', action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED, status: AuditStatus.FAILURE },
            metadata: { timestamp: now.toISOString() },
            createdAt: now,
         },
      ];

      eventStore.getAllEvents.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce([]);

      const result = await service.rebuildAll({ batchSize: 2 });

      expect(result.replayedCount).toBe(2);
      expect(securityAuditLogProjection.project).toHaveBeenCalledTimes(2);
      expect(securityScoreProjection.project).toHaveBeenCalledTimes(2);
      expect(threatDetectionProjection.project).toHaveBeenCalledTimes(2);
   });

   it('should stop immediately when event store has 0 events', async () => {
      eventStore.getAllEvents.mockResolvedValueOnce([]);

      const result = await service.rebuildAll();

      expect(result.replayedCount).toBe(0);
      expect(securityAuditLogProjection.project).not.toHaveBeenCalled();
   });
});
