import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES, SERVICES } from '@common';
import { UserRegisteredEventHandler } from './user-registered.handler';
import { UserRegisteredEvent } from '@auth/domain/events';

describe('UserRegisteredEventHandler', () => {
   let handler: UserRegisteredEventHandler;

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserRegisteredEventHandler,
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
         ],
      }).compile();

      handler = module.get<UserRegisteredEventHandler>(UserRegisteredEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should emit send_email pattern via notification client on user registered event', async () => {
      mockNotificationClient.emit.mockReturnValue(of(true));

      const event = new UserRegisteredEvent('acc-123', 'test@example.com', new Date('2026-01-01T00:00:00.000Z'), {
         ipAddress: '127.0.0.1',
      });

      await handler.handle(event);

      expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
         to: 'test@example.com',
         subject: NOTIFICATION_EMAIL_SUBJECTS.WELCOME,
         template: NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
         data: {
            email: 'test@example.com',
            registeredAt: event.registeredAt,
         },
      });
   });

   it('should not throw if notification client fails', async () => {
      mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('RabbitMQ connection lost')));

      const event = new UserRegisteredEvent('acc-123', 'test@example.com', new Date());

      await expect(handler.handle(event)).resolves.not.toThrow();
   });
});
