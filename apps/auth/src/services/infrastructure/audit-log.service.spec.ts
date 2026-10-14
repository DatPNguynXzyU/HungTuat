import { Test, type TestingModule } from '@nestjs/testing';
import { AuditStatus } from '@auth/prisma-client';
import { AUDIT_ACTIONS, SECURITY_RISK_LEVELS } from '@contracts/auth';
import { AUDIT_LOG_REPOSITORY } from '@auth/repositories/audit-log.repository.interface';
import { AUDIT_EVENT_STORE } from '@auth/cqrs/constants/audit-cqrs.constant';
import { AccountSecurityScoreProjection, ThreatDetectionMetricsProjection } from '@auth/cqrs/read';
import { AuditProjectionRebuildService } from '@auth/cqrs/services/audit-projection-rebuild.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
   let service: AuditLogService;

   const sampleAuditLog = {
      id: 'audit-id-1',
      accountId: 'user-id-1',
      actorEmail: 'test@example.com',
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      status: AuditStatus.SUCCESS,
      ipAddress: '127.0.0.1',
      createdAt: '2026-09-28T00:00:00.000Z',
   };

   const mockAuditLogRepository = {
      createAuditLog: jest.fn(),
      findAuditLogs: jest.fn(),
      findById: jest.fn(),
      findAccountAuditLogs: jest.fn(),
   };

   const mockEventStore = {
      appendEvent: jest.fn(),
      getStream: jest.fn(),
      getAllEvents: jest.fn(),
      countEvents: jest.fn(),
   };

   const mockSecurityScoreProjection = {
      getScore: jest.fn(),
      project: jest.fn(),
   };

   const mockThreatDetectionProjection = {
      getTodayMetrics: jest.fn(),
      getMetricsByDate: jest.fn(),
      project: jest.fn(),
   };

   const mockRebuildService = {
      rebuildAll: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditLogService,
            { provide: AUDIT_EVENT_STORE, useValue: mockEventStore },
            { provide: AUDIT_LOG_REPOSITORY, useValue: mockAuditLogRepository },
            { provide: AccountSecurityScoreProjection, useValue: mockSecurityScoreProjection },
            { provide: ThreatDetectionMetricsProjection, useValue: mockThreatDetectionProjection },
            { provide: AuditProjectionRebuildService, useValue: mockRebuildService },
         ],
      }).compile();

      service = module.get<AuditLogService>(AuditLogService);
   });

   describe('record', () => {
      it('should append event to event store and return entity representation', async () => {
         const createdAt = new Date('2026-09-28T00:00:00.000Z');
         mockEventStore.appendEvent.mockResolvedValue({
            eventId: 'audit-id-1',
            streamId: 'audit-user-id-1',
            eventType: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            version: 1,
            data: {},
            metadata: { timestamp: createdAt.toISOString() },
            createdAt,
         });

         const result = await service.record({
            accountId: 'user-id-1',
            actorEmail: 'test@example.com',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            status: AuditStatus.SUCCESS,
            ipAddress: '127.0.0.1',
         });

         expect(result).toEqual({
            id: 'audit-id-1',
            accountId: 'user-id-1',
            actorEmail: 'test@example.com',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            status: AuditStatus.SUCCESS,
            ipAddress: '127.0.0.1',
            userAgent: null,
            deviceType: null,
            deviceName: null,
            browser: null,
            os: null,
            city: null,
            country: null,
            reason: null,
            metadata: null,
            createdAt: createdAt.toISOString(),
         });
         expect(mockEventStore.appendEvent).toHaveBeenCalled();
      });

      it('should handle store error gracefully when recording', async () => {
         mockEventStore.appendEvent.mockRejectedValue(new Error('Event store unavailable'));

         const result = await service.record({
            accountId: 'user-id-1',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         });

         expect(result).toBeNull();
      });
   });

   describe('read queries', () => {
      it('should get audit logs list from repository', async () => {
         const mockResult = {
            data: [sampleAuditLog],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
         };
         mockAuditLogRepository.findAuditLogs.mockResolvedValue(mockResult);

         const result = await service.getAuditLogs({ page: 1, limit: 10 });
         expect(result).toEqual(mockResult);
      });

      it('should get audit log by id from repository', async () => {
         mockAuditLogRepository.findById.mockResolvedValue(sampleAuditLog);

         const result = await service.getAuditLogById('audit-id-1');
         expect(result).toEqual(sampleAuditLog);
      });

      it('should get account audit logs from repository', async () => {
         const mockResult = {
            data: [sampleAuditLog],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
         };
         mockAuditLogRepository.findAccountAuditLogs.mockResolvedValue(mockResult);

         const result = await service.getAccountAuditLogs('user-id-1', 1, 10);
         expect(result).toEqual(mockResult);
      });

      it('should get security score from projection', async () => {
         const mockScore = {
            accountId: 'user-id-1',
            score: 95,
            riskLevel: SECURITY_RISK_LEVELS.LOW,
            failedLoginAttempts: 1,
            successfulLogins: 5,
            passwordChanges: 1,
            suspiciousActivities: 0,
            lastUpdated: new Date(),
         };
         mockSecurityScoreProjection.getScore.mockResolvedValue(mockScore);

         const result = await service.getSecurityScore('user-id-1');
         expect(result).toEqual(mockScore);
         expect(mockSecurityScoreProjection.getScore).toHaveBeenCalledWith('user-id-1');
      });

      it('should get threat metrics for today and specific date', async () => {
         const mockTodayMetrics = {
            date: '2026-10-14',
            totalFailedLogins: 5,
            uniqueLockedAccounts: 1,
            suspiciousIps: [],
            topFailureReasons: {},
         };
         mockThreatDetectionProjection.getTodayMetrics.mockResolvedValue(mockTodayMetrics);
         mockThreatDetectionProjection.getMetricsByDate.mockResolvedValue(mockTodayMetrics);

         const todayResult = await service.getThreatMetrics();
         expect(todayResult).toEqual(mockTodayMetrics);
         expect(mockThreatDetectionProjection.getTodayMetrics).toHaveBeenCalled();

         const dateResult = await service.getThreatMetrics('2026-10-14');
         expect(dateResult).toEqual(mockTodayMetrics);
         expect(mockThreatDetectionProjection.getMetricsByDate).toHaveBeenCalledWith('2026-10-14');
      });
   });

   describe('rebuildProjections', () => {
      it('should delegate rebuild to AuditProjectionRebuildService', async () => {
         mockRebuildService.rebuildAll.mockResolvedValue({
            replayedCount: 42,
            durationMs: 120,
         });

         const result = await service.rebuildProjections({ batchSize: 50 });

         expect(result).toEqual({ replayedCount: 42, durationMs: 120 });
         expect(mockRebuildService.rebuildAll).toHaveBeenCalledWith({ batchSize: 50 });
      });
   });
});
