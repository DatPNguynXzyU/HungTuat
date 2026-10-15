import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@auth/prisma/prisma.service';
import { OutboxRepository } from '@auth/outbox/repositories/outbox.repository';

describe('OutboxRepository', () => {
   let repository: OutboxRepository;
   let prismaService: {
      outboxEvent: {
         create: jest.Mock;
         findMany: jest.Mock;
         findUnique: jest.Mock;
         update: jest.Mock;
         updateMany: jest.Mock;
         deleteMany: jest.Mock;
      };
   };

   beforeEach(async () => {
      prismaService = {
         outboxEvent: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            OutboxRepository,
            {
               provide: PrismaService,
               useValue: prismaService,
            },
         ],
      }).compile();

      repository = module.get<OutboxRepository>(OutboxRepository);
   });

   it('should be defined', () => {
      expect(repository).toBeDefined();
   });

   it('should create an outbox event', async () => {
      const now = new Date();
      prismaService.outboxEvent.create.mockResolvedValue({
         eventId: 'event-1',
         aggregateType: 'USER',
         aggregateId: 'user-1',
         eventType: 'USER_REGISTERED',
         payload: { email: 'test@example.com' },
         status: 'PENDING',
         retryCount: 0,
         lastError: null,
         processedAt: null,
         createdAt: now,
         updatedAt: now,
      });

      const result = await repository.create({
         aggregateType: 'USER',
         aggregateId: 'user-1',
         eventType: 'USER_REGISTERED',
         payload: { email: 'test@example.com' },
      });

      expect(result).toBeDefined();
      expect(result.eventId).toBe('event-1');
      expect(result.status).toBe('PENDING');
      expect(prismaService.outboxEvent.create).toHaveBeenCalled();
   });

   it('should find pending events', async () => {
      const now = new Date();
      prismaService.outboxEvent.findMany.mockResolvedValue([
         {
            eventId: 'event-1',
            aggregateType: 'USER',
            aggregateId: 'user-1',
            eventType: 'USER_REGISTERED',
            payload: {},
            status: 'PENDING',
            retryCount: 0,
            lastError: null,
            processedAt: null,
            createdAt: now,
            updatedAt: now,
         },
      ]);

      const events = await repository.findPending(10);
      expect(events).toHaveLength(1);
      expect(events[0].eventId).toBe('event-1');
      expect(prismaService.outboxEvent.findMany).toHaveBeenCalledWith({
         where: { status: { in: ['PENDING', 'PROCESSING'] } },
         orderBy: { createdAt: 'asc' },
         take: 10,
      });
   });

   it('should mark events as processing', async () => {
      prismaService.outboxEvent.updateMany.mockResolvedValue({ count: 2 });
      await repository.markAsProcessing(['id1', 'id2']);
      expect(prismaService.outboxEvent.updateMany).toHaveBeenCalledWith({
         where: { eventId: { in: ['id1', 'id2'] } },
         data: { status: 'PROCESSING' },
      });
   });

   it('should mark event as published', async () => {
      prismaService.outboxEvent.update.mockResolvedValue({});
      await repository.markAsPublished('event-1');
      expect(prismaService.outboxEvent.update).toHaveBeenCalledWith({
         where: { eventId: 'event-1' },
         data: expect.objectContaining({
            status: 'PUBLISHED',
            lastError: null,
         }) as unknown,
      });
   });

   it('should mark event as failed and retry if below maxRetries', async () => {
      prismaService.outboxEvent.findUnique.mockResolvedValue({
         eventId: 'event-1',
         retryCount: 1,
      });
      prismaService.outboxEvent.update.mockResolvedValue({});

      await repository.markAsFailed('event-1', 'Connection timeout', 5);

      expect(prismaService.outboxEvent.update).toHaveBeenCalledWith({
         where: { eventId: 'event-1' },
         data: {
            status: 'PENDING',
            retryCount: 2,
            lastError: 'Connection timeout',
         },
      });
   });

   it('should mark event as FAILED when reaching maxRetries', async () => {
      prismaService.outboxEvent.findUnique.mockResolvedValue({
         eventId: 'event-1',
         retryCount: 4,
      });
      prismaService.outboxEvent.update.mockResolvedValue({});

      await repository.markAsFailed('event-1', 'Permanent error', 5);

      expect(prismaService.outboxEvent.update).toHaveBeenCalledWith({
         where: { eventId: 'event-1' },
         data: expect.objectContaining({
            status: 'FAILED',
            retryCount: 5,
            lastError: 'Permanent error',
         }) as unknown,
      });
   });

   it('should delete events by aggregate id', async () => {
      prismaService.outboxEvent.deleteMany.mockResolvedValue({ count: 1 });
      await repository.deleteByAggregateId('user-1');
      expect(prismaService.outboxEvent.deleteMany).toHaveBeenCalledWith({
         where: { aggregateId: 'user-1' },
      });
   });
});
