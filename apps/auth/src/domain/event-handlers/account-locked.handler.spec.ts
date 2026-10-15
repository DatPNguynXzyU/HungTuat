import { Test, TestingModule } from '@nestjs/testing';
import { NOTIFICATION_ADAPTER } from '@auth/adapters';
import { AccountLockedEventHandler } from '@auth/domain/event-handlers/account-locked.handler';
import { AccountLockedEvent } from '@auth/domain/events/account-locked.event';

describe('AccountLockedEventHandler', () => {
   let handler: AccountLockedEventHandler;

   const mockNotificationAdapter = {
      sendSecurityAlert: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AccountLockedEventHandler,
            {
               provide: NOTIFICATION_ADAPTER,
               useValue: mockNotificationAdapter,
            },
         ],
      }).compile();

      handler = module.get<AccountLockedEventHandler>(AccountLockedEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should send security alert email via notification adapter on account locked event', async () => {
      mockNotificationAdapter.sendSecurityAlert.mockResolvedValue(undefined);

      const event = new AccountLockedEvent(
         'acc-123',
         'locked@example.com',
         '192.168.1.1',
         'AUTH.ACCOUNT_LOCKED_TEMPORARILY',
         new Date('2026-01-01T01:00:00.000Z'),
         5,
      );

      await handler.handle(event);

      expect(mockNotificationAdapter.sendSecurityAlert).toHaveBeenCalledWith({
         email: 'locked@example.com',
         ipAddress: '192.168.1.1',
         lockedUntil: event.lockedUntil,
         failedAttempts: 5,
      });
   });

   it('should catch error and not throw when notification adapter fails', async () => {
      mockNotificationAdapter.sendSecurityAlert.mockRejectedValue(new Error('RabbitMQ down'));

      const event = new AccountLockedEvent(
         'acc-123',
         'locked@example.com',
         '192.168.1.1',
         'AUTH.ACCOUNT_LOCKED_TEMPORARILY',
         new Date(),
         5,
      );

      await expect(handler.handle(event)).resolves.not.toThrow();
   });
});
