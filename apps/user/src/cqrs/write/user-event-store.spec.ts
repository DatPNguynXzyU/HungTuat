import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserEventStore } from '@user/cqrs/write/user-event-store';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { USER_CQRS_EVENTS } from '@user/cqrs/constants/user-cqrs.constant';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';

describe('UserEventStore', () => {
   let service: UserEventStore;
   let prisma: {
      userEventStream: {
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
         userEventStream: {
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
            UserEventStore,
            { provide: PrismaService, useValue: prisma },
            { provide: EventEmitter2, useValue: eventEmitter },
         ],
      }).compile();

      service = module.get<UserEventStore>(UserEventStore);
   });

   describe('appendEvent', () => {
      it('should append an event and emit USER_CQRS_EVENTS.EVENT_APPENDED', async () => {
         const now = new Date();
         const payload = {
            userId: 'user-123',
            accountId: 'acc-456',
            username: 'john_doe',
         };

         prisma.userEventStream.create.mockResolvedValue({
            eventId: 'event-uuid-1',
            streamId: 'user-user-123',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            version: 1,
            data: payload,
            metadata: { timestamp: now.toISOString(), correlationId: 'corr-1' },
            createdAt: now,
         });

         const result = await service.appendEvent({
            eventId: 'event-uuid-1',
            streamId: 'user-user-123',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            data: payload,
            metadata: { correlationId: 'corr-1' },
            createdAt: now,
         });

         expect(prisma.userEventStream.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
               eventId: 'event-uuid-1',
               streamId: 'user-user-123',
               eventType: USER_DOMAIN_EVENTS.USER_CREATED,
               data: payload,
               createdAt: now,
            }),
         });

         expect(eventEmitter.emit).toHaveBeenCalledWith(
            USER_CQRS_EVENTS.EVENT_APPENDED,
            expect.objectContaining({
               eventId: 'event-uuid-1',
               streamId: 'user-user-123',
               eventType: USER_DOMAIN_EVENTS.USER_CREATED,
               version: 1,
            }),
         );

         expect(result.eventId).toBe('event-uuid-1');
         expect(result.version).toBe(1);
         expect(result.data).toEqual(payload);
      });
   });

   describe('getStream', () => {
      it('should retrieve ordered stream events', async () => {
         const records = [
            {
               eventId: 'e1',
               streamId: 'user-1',
               eventType: USER_DOMAIN_EVENTS.USER_CREATED,
               version: 1,
               data: { userId: '1' },
               metadata: { timestamp: '2026-01-01' },
               createdAt: new Date(),
            },
            {
               eventId: 'e2',
               streamId: 'user-1',
               eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
               version: 2,
               data: { userId: '1' },
               metadata: { timestamp: '2026-01-02' },
               createdAt: new Date(),
            },
         ];

         prisma.userEventStream.findMany.mockResolvedValue(records);

         const result = await service.getStream('user-1', 1);

         expect(prisma.userEventStream.findMany).toHaveBeenCalledWith({
            where: {
               streamId: 'user-1',
               version: { gte: 1 },
            },
            orderBy: { version: 'asc' },
         });

         expect(result).toHaveLength(2);
         expect(result[0].version).toBe(1);
         expect(result[1].version).toBe(2);
      });
   });

   describe('getAllEvents', () => {
      it('should retrieve events with pagination options', async () => {
         prisma.userEventStream.findMany.mockResolvedValue([]);

         const result = await service.getAllEvents({ fromVersion: 5, take: 50, skip: 10 });

         expect(prisma.userEventStream.findMany).toHaveBeenCalledWith({
            where: {
               version: { gte: 5 },
            },
            orderBy: { version: 'asc' },
            take: 50,
            skip: 10,
         });

         expect(result).toEqual([]);
      });
   });

   describe('countEvents', () => {
      it('should return total count or count by streamId', async () => {
         prisma.userEventStream.count.mockResolvedValue(42);

         const count = await service.countEvents('user-1');

         expect(prisma.userEventStream.count).toHaveBeenCalledWith({
            where: { streamId: 'user-1' },
         });
         expect(count).toBe(42);
      });
   });
});
