import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { RabbitMqOutboxEventPublisher } from '@auth/outbox/adapters/rabbitmq-outbox-event-publisher.adapter';

describe('RabbitMqOutboxEventPublisher', () => {
   let publisher: RabbitMqOutboxEventPublisher;
   let notificationClient: { emit: jest.Mock };
   let userClient: { emit: jest.Mock };

   beforeEach(async () => {
      notificationClient = { emit: jest.fn().mockReturnValue(of(true)) };
      userClient = { emit: jest.fn().mockReturnValue(of(true)) };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RabbitMqOutboxEventPublisher,
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

      publisher = module.get<RabbitMqOutboxEventPublisher>(RabbitMqOutboxEventPublisher);
   });

   it('should be defined', () => {
      expect(publisher).toBeDefined();
   });

   it('should emit integration event to both notification and user clients', async () => {
      await publisher.publish('auth.user_registered', { userId: '123' });

      expect(notificationClient.emit).toHaveBeenCalledWith('auth.user_registered', { userId: '123' });
      expect(userClient.emit).toHaveBeenCalledWith('auth.user_registered', { userId: '123' });
   });
});
