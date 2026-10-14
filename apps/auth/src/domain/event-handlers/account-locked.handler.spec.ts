import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { AccountLockedEventHandler } from '@auth/domain/event-handlers/account-locked.handler';
import { AccountLockedEvent } from '@auth/domain/events/account-locked.event';

describe('AccountLockedEventHandler', () => {
   let handler: AccountLockedEventHandler;

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AccountLockedEventHandler,
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
         ],
      }).compile();

      handler = module.get<AccountLockedEventHandler>(AccountLockedEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should emit security alert email via notification client on account locked event', async () => {
      mockNotificationClient.emit.mockReturnValue(of(true));

      const event = new AccountLockedEvent(
         'acc-123',
         'locked@example.com',
         '192.168.1.1',
         'AUTH.ACCOUNT_LOCKED_TEMPORARILY',
         new Date('2026-01-01T01:00:00.000Z'),
         5,
      );

      await handler.handle(event);

      expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
         to: 'locked@example.com',
         subject: NOTIFICATION_EMAIL_SUBJECTS.ACCOUNT_LOCKED,
         template: NOTIFICATION_TEMPLATES.SECURITY_ALERT_ACCOUNT_LOCKED,
         data: {
            email: 'locked@example.com',
            ipAddress: '192.168.1.1',
            lockedUntil: event.lockedUntil,
            failedAttempts: 5,
         },
      });
   });

   it('should catch error and not throw when notification client fails', async () => {
      mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('RabbitMQ down')));

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
