import { Test, TestingModule } from '@nestjs/testing';
import { NOTIFICATION_ADAPTER } from '@auth/adapters';
import { PasswordChangedEventHandler } from '@auth/domain/event-handlers/password-changed.handler';
import { PasswordChangedEvent } from '@auth/domain/events/password-changed.event';

describe('PasswordChangedEventHandler', () => {
   let handler: PasswordChangedEventHandler;

   const mockNotificationAdapter = {
      sendPasswordChangedConfirmation: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PasswordChangedEventHandler,
            {
               provide: NOTIFICATION_ADAPTER,
               useValue: mockNotificationAdapter,
            },
         ],
      }).compile();

      handler = module.get<PasswordChangedEventHandler>(PasswordChangedEventHandler);
   });

   it('should be defined', () => {
      expect(handler).toBeDefined();
   });

   it('should send password changed confirmation email via notification adapter', async () => {
      mockNotificationAdapter.sendPasswordChangedConfirmation.mockResolvedValue(undefined);

      const event = new PasswordChangedEvent(
         'acc-123',
         'user@example.com',
         new Date('2026-01-01T12:00:00.000Z'),
         '10.0.0.1',
         { deviceType: 'desktop' },
      );

      await handler.handle(event);

      expect(mockNotificationAdapter.sendPasswordChangedConfirmation).toHaveBeenCalledWith({
         email: 'user@example.com',
         changedAt: event.changedAt,
         ipAddress: '10.0.0.1',
         deviceType: 'desktop',
      });
   });

   it('should catch error and not throw when notification adapter fails', async () => {
      mockNotificationAdapter.sendPasswordChangedConfirmation.mockRejectedValue(new Error('RabbitMQ disconnected'));

      const event = new PasswordChangedEvent('acc-123', 'user@example.com', new Date());

      await expect(handler.handle(event)).resolves.not.toThrow();
   });
});
