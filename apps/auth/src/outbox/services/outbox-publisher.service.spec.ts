import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { OUTBOX_REPOSITORY } from '@auth/outbox/repositories/outbox.repository.interface';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';

describe('OutboxPublisherService', () => {
   let service: OutboxPublisherService;
   let outboxRepository: {
      findPending: jest.Mock;
      markAsProcessing: jest.Mock;
      markAsPublished: jest.Mock;
      markAsFailed: jest.Mock;
   };
   let notificationClient: {
      emit: jest.Mock;
   };
   let userClient: {
      emit: jest.Mock;
   };

   beforeEach(async () => {
      outboxRepository = {
         findPending: jest.fn(),
         markAsProcessing: jest.fn(),
         markAsPublished: jest.fn(),
         markAsFailed: jest.fn(),
      };

      notificationClient = {
         emit: jest.fn().mockReturnValue(of(true)),
      };

      userClient = {
         emit: jest.fn().mockReturnValue(of(true)),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            OutboxPublisherService,
            {
               provide: OUTBOX_REPOSITORY,
               useValue: outboxRepository,
            },
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: notificationClient,
            },
            {
               provide: SERVICES.USER_SERVICE,
               useValue: userClient,
            },
         ],
      }).compile();

      service = module.get<OutboxPublisherService>(OutboxPublisherService);
   });

   afterEach(() => {
      service.stopPolling();
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should return 0 when no pending events exist', async () => {
      outboxRepository.findPending.mockResolvedValue([]);
      const count = await service.publishPendingEvents();
      expect(count).toBe(0);
      expect(notificationClient.emit).not.toHaveBeenCalled();
      expect(userClient.emit).not.toHaveBeenCalled();
   });

   it('should publish pending events to both notification and user services and mark them as published', async () => {
      const pendingEvents = [
         {
            eventId: 'event-1',
            aggregateType: 'USER',
            aggregateId: 'user-1',
            eventType: 'USER_REGISTERED',
            payload: { email: 'test@example.com' },
            status: 'PENDING',
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
         },
      ];

      outboxRepository.findPending.mockResolvedValue(pendingEvents);
      notificationClient.emit.mockReturnValue(of(true));
      userClient.emit.mockReturnValue(of(true));

      const count = await service.publishPendingEvents();

      expect(count).toBe(1);
      expect(outboxRepository.markAsProcessing).toHaveBeenCalledWith(['event-1']);
      expect(notificationClient.emit).toHaveBeenCalledWith('USER_REGISTERED', { email: 'test@example.com' });
      expect(userClient.emit).toHaveBeenCalledWith('USER_REGISTERED', { email: 'test@example.com' });
      expect(outboxRepository.markAsPublished).toHaveBeenCalledWith('event-1');
   });

   it('should handle publication failure and mark as failed if unexpected throw', async () => {
      const pendingEvents = [
         {
            eventId: 'event-2',
            aggregateType: 'USER',
            aggregateId: 'user-2',
            eventType: 'USER_REGISTERED',
            payload: { email: 'fail@example.com' },
            status: 'PENDING',
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
         },
      ];

      outboxRepository.findPending.mockResolvedValue(pendingEvents);
      outboxRepository.markAsPublished.mockRejectedValue(new Error('Database write error'));

      const count = await service.publishPendingEvents();

      expect(count).toBe(0);
      expect(outboxRepository.markAsFailed).toHaveBeenCalledWith('event-2', 'Database write error', 5);
   });
});
