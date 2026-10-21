import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { RabbitMqOutboxEventPublisher } from '@auth/outbox/adapters/rabbitmq-outbox-event-publisher.adapter';

describe('RabbitMqOutboxEventPublisher', () => {
   let publisher: RabbitMqOutboxEventPublisher;
   let notificationClient: { emit: jest.Mock };
   let userClient: { emit: jest.Mock };
   let supplierClient: { emit: jest.Mock };

   beforeEach(async () => {
      notificationClient = { emit: jest.fn().mockReturnValue(of(true)) };
      userClient = { emit: jest.fn().mockReturnValue(of(true)) };
      supplierClient = { emit: jest.fn().mockReturnValue(of(true)) };

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
            {
               provide: SERVICES.SUPPLIER_SERVICE,
               useValue: supplierClient,
            },
         ],
      }).compile();

      publisher = module.get<RabbitMqOutboxEventPublisher>(RabbitMqOutboxEventPublisher);
   });

   it('should be defined', () => {
      expect(publisher).toBeDefined();
   });

   it('should emit integration event to both notification and user clients for user events', async () => {
      await publisher.publish(NOTIFICATION_EVENTS.USER_REGISTERED, { userId: '123' });

      expect(notificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.USER_REGISTERED, { userId: '123' });
      expect(userClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.USER_REGISTERED, { userId: '123' });
      expect(supplierClient.emit).not.toHaveBeenCalled();
   });

   it('should emit integration event to notification and supplier clients for supplier events', async () => {
      await publisher.publish(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED, { accountId: 'acc-1', email: 'sup@test.com' });

      expect(notificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED, {
         accountId: 'acc-1',
         email: 'sup@test.com',
      });
      expect(supplierClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED, {
         accountId: 'acc-1',
         email: 'sup@test.com',
      });
      expect(userClient.emit).not.toHaveBeenCalled();
   });
});
