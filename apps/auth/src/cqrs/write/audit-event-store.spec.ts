import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEventStore } from '@auth/cqrs/write/audit-event-store';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AUDIT_CQRS_EVENTS } from '@auth/cqrs/constants/audit-cqrs.constant';
import { AuditStatus } from '@auth/prisma-client';
import { AUDIT_ACTIONS } from '@contracts/auth';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

describe('AuditEventStore', () => {
   let service: AuditEventStore;
   let prisma: {
      auditEventStream: {
         create: jest.Mock;
         findMany: jest.Mock;
         count: jest.Mock;
      };
   };
   let eventEmitter: {
      emit: jest.Mock;
   };

   beforeEach(async () => {
      prisma = {
         auditEventStream: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
         },
      };

      eventEmitter = {
         emit: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditEventStore,
            { provide: PrismaService, useValue: prisma },
            { provide: EventEmitter2, useValue: eventEmitter },
         ],
      }).compile();

      service = module.get<AuditEventStore>(AuditEventStore);
   });

   describe('appendEvent', () => {
      it('should append an audit event and emit AUDIT_CQRS_EVENTS.EVENT_APPENDED', async () => {
         const now = new Date();
         const data: CreateAuditLogData = {
            id: 'event-uuid-1',
            accountId: 'acc-123',
            actorEmail: 'test@example.com',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            status: AuditStatus.SUCCESS,
            ipAddress: '127.0.0.1',
            metadata: { correlationId: 'req-cor-1', foo: 'bar' },
         };

         prisma.auditEventStream.create.mockResolvedValue({
            eventId: 'event-uuid-1',
            streamId: 'audit-acc-123',
            eventType: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            version: 1,
            data: {
               accountId: 'acc-123',
               actorEmail: 'test@example.com',
               action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
               status: AuditStatus.SUCCESS,
            },
            metadata: { timestamp: now.toISOString(), correlationId: 'req-cor-1' },
            createdAt: now,
         });

         const result = await service.appendEvent(data);

         expect(prisma.auditEventStream.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({
                  eventId: 'event-uuid-1',
                  streamId: 'audit-acc-123',
                  eventType: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
               }) as unknown,
            }),
         );
         expect(eventEmitter.emit).toHaveBeenCalledWith(AUDIT_CQRS_EVENTS.EVENT_APPENDED, data);
         expect(result.eventId).toBe('event-uuid-1');
         expect(result.streamId).toBe('audit-acc-123');
         expect(result.version).toBe(1);
      });

      it('should handle system event when accountId is missing and failure status', async () => {
         const data: CreateAuditLogData = {
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: 'FAILURE',
         };

         prisma.auditEventStream.create.mockResolvedValue({
            eventId: 'gen-uuid-2',
            streamId: 'audit-system',
            eventType: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            version: 2,
            data: { action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED, status: AuditStatus.FAILURE },
            metadata: { timestamp: new Date().toISOString() },
            createdAt: new Date(),
         });

         const result = await service.appendEvent(data);

         expect(result.streamId).toBe('audit-system');
         expect(eventEmitter.emit).toHaveBeenCalledWith(AUDIT_CQRS_EVENTS.EVENT_APPENDED, data);
      });
   });

   describe('getStream', () => {
      it('should fetch events by streamId ordered by version', async () => {
         const mockRecords = [
            {
               eventId: 'e-1',
               streamId: 'audit-acc-1',
               eventType: AUDIT_ACTIONS.AUTH_REGISTER,
               version: 1,
               data: {},
               metadata: { timestamp: new Date().toISOString() },
               createdAt: new Date(),
            },
         ];
         prisma.auditEventStream.findMany.mockResolvedValue(mockRecords);

         const result = await service.getStream('audit-acc-1', 1);

         expect(prisma.auditEventStream.findMany).toHaveBeenCalledWith({
            where: { streamId: 'audit-acc-1', version: { gte: 1 } },
            orderBy: { version: 'asc' },
         });
         expect(result).toHaveLength(1);
         expect(result[0].eventId).toBe('e-1');
      });
   });

   describe('getAllEvents', () => {
      it('should fetch all events with pagination options', async () => {
         prisma.auditEventStream.findMany.mockResolvedValue([]);

         await service.getAllEvents({ fromVersion: 2, take: 50, skip: 10 });

         expect(prisma.auditEventStream.findMany).toHaveBeenCalledWith({
            where: { version: { gte: 2 } },
            orderBy: { version: 'asc' },
            take: 50,
            skip: 10,
         });
      });
   });

   describe('countEvents', () => {
      it('should count events with optional streamId filter', async () => {
         prisma.auditEventStream.count.mockResolvedValue(42);

         const count = await service.countEvents('audit-acc-1');

         expect(prisma.auditEventStream.count).toHaveBeenCalledWith({
            where: { streamId: 'audit-acc-1' },
         });
         expect(count).toBe(42);
      });
   });
});
