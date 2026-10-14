import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { PasswordChangedEventHandler } from '@auth/domain/event-handlers/password-changed.handler';
import { PasswordChangedEvent } from '@auth/domain/events/password-changed.event';

describe('PasswordChangedEventHandler', () => {
   let handler: PasswordChangedEventHandler;

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PasswordChangedEventHandler,
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
         ],
      }).compile();

      handler = module.get<PasswordChangedEventHandler>(PasswordChangedEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should emit password changed confirmation email via notification client', async () => {
      mockNotificationClient.emit.mockReturnValue(of(true));

      const event = new PasswordChangedEvent(
         'acc-123',
         'user@example.com',
         new Date('2026-01-01T12:00:00.000Z'),
         '10.0.0.1',
         { deviceType: 'desktop' },
      );

      await handler.handle(event);

      expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
         to: 'user@example.com',
         subject: NOTIFICATION_EMAIL_SUBJECTS.PASSWORD_CHANGED,
         template: NOTIFICATION_TEMPLATES.PASSWORD_CHANGED,
         data: {
            email: 'user@example.com',
            changedAt: event.changedAt,
            ipAddress: '10.0.0.1',
            deviceType: 'desktop',
         },
      });
   });

   it('should catch error and not throw when notification client fails', async () => {
      mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('RabbitMQ disconnected')));

      const event = new PasswordChangedEvent('acc-123', 'user@example.com', new Date());

      await expect(handler.handle(event)).resolves.not.toThrow();
   });
});
