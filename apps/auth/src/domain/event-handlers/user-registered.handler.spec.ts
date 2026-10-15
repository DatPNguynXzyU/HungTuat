import { Test, TestingModule } from '@nestjs/testing';
import { NOTIFICATION_ADAPTER } from '@auth/adapters';
import { UserRegisteredEventHandler } from '@auth/domain/event-handlers/user-registered.handler';
import { UserRegisteredEvent } from '@auth/domain/events/user-registered.event';

describe('UserRegisteredEventHandler', () => {
   let handler: UserRegisteredEventHandler;

   const mockNotificationAdapter = {
      sendWelcomeEmail: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserRegisteredEventHandler,
            {
               provide: NOTIFICATION_ADAPTER,
               useValue: mockNotificationAdapter,
            },
         ],
      }).compile();

      handler = module.get<UserRegisteredEventHandler>(UserRegisteredEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should send welcome email via notification adapter on user registered event', async () => {
      mockNotificationAdapter.sendWelcomeEmail.mockResolvedValue(undefined);

      const event = new UserRegisteredEvent('acc-123', 'test@example.com', new Date('2026-01-01T00:00:00.000Z'), {
         ipAddress: '127.0.0.1',
      });

      await handler.handle(event);

      expect(mockNotificationAdapter.sendWelcomeEmail).toHaveBeenCalledWith({
         email: 'test@example.com',
         registeredAt: event.registeredAt,
      });
   });

   it('should not throw if notification adapter fails', async () => {
      mockNotificationAdapter.sendWelcomeEmail.mockRejectedValue(new Error('RabbitMQ connection lost'));

      const event = new UserRegisteredEvent('acc-123', 'test@example.com', new Date());

      await expect(handler.handle(event)).resolves.not.toThrow();
   });
});
