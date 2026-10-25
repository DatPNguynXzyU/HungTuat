import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { RabbitMqNotificationAdapter } from '@auth/adapters/notification/rabbitmq-notification.adapter';

describe('RabbitMqNotificationAdapter', () => {
   let adapter: RabbitMqNotificationAdapter;
   const mockNotificationClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RabbitMqNotificationAdapter,
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
         ],
      }).compile();

      adapter = module.get<RabbitMqNotificationAdapter>(RabbitMqNotificationAdapter);
   });

   it('should be defined', () => {
      expect(adapter).toBeDefined();
   });

   describe('sendRegistrationOtp', () => {
      it('should emit registration OTP message successfully', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));

         await adapter.sendRegistrationOtp('user@example.com', '123456', 5);

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_OTP_EMAIL, {
            eventId: expect.any(String),
            to: 'user@example.com',
            otpCode: '123456',
            expiresInMinutes: 5,
         });
      });

      it('should catch error and log when emission fails without throwing', async () => {
         mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('RabbitMQ unavailable')));

         await expect(adapter.sendRegistrationOtp('user@example.com', '123456', 5)).resolves.not.toThrow();
      });
   });

   describe('sendChangePasswordOtp', () => {
      it('should emit change password OTP message successfully', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));

         await adapter.sendChangePasswordOtp('user@example.com', '654321', 10);

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(
            NOTIFICATION_PATTERNS.SEND_CHANGE_PASSWORD_OTP_EMAIL,
            {
               eventId: expect.any(String),
               to: 'user@example.com',
               otpCode: '654321',
               expiresInMinutes: 10,
            },
         );
      });

      it('should catch error and log when emission fails without throwing', async () => {
         mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('RabbitMQ unavailable')));

         await expect(adapter.sendChangePasswordOtp('user@example.com', '654321', 10)).resolves.not.toThrow();
      });
   });

   describe('sendSecurityAlert', () => {
      it('should emit security alert email with correct pattern and template', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));
         const lockedUntil = new Date('2026-01-01T00:00:00.000Z');

         await adapter.sendSecurityAlert({
            email: 'alert@example.com',
            ipAddress: '127.0.0.1',
            lockedUntil,
            failedAttempts: 5,
         });

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            eventId: expect.any(String),
            to: 'alert@example.com',
            subject: NOTIFICATION_EMAIL_SUBJECTS.ACCOUNT_LOCKED,
            template: NOTIFICATION_TEMPLATES.SECURITY_ALERT_ACCOUNT_LOCKED,
            data: {
               email: 'alert@example.com',
               ipAddress: '127.0.0.1',
               lockedUntil,
               failedAttempts: 5,
            },
         });
      });

      it('should rethrow error when emission fails', async () => {
         mockNotificationClient.emit.mockReturnValue(throwError(() => new Error('Network error')));

         await expect(
            adapter.sendSecurityAlert({
               email: 'alert@example.com',
               lockedUntil: new Date(),
               failedAttempts: 3,
            }),
         ).rejects.toThrow('Network error');
      });
   });

   describe('sendPasswordChangedConfirmation', () => {
      it('should emit password changed confirmation email', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));
         const changedAt = new Date('2026-01-01T12:00:00.000Z');

         await adapter.sendPasswordChangedConfirmation({
            email: 'user@example.com',
            changedAt,
            ipAddress: '192.168.1.1',
            deviceType: 'mobile',
         });

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            eventId: expect.any(String),
            to: 'user@example.com',
            subject: NOTIFICATION_EMAIL_SUBJECTS.PASSWORD_CHANGED,
            template: NOTIFICATION_TEMPLATES.PASSWORD_CHANGED,
            data: {
               email: 'user@example.com',
               changedAt,
               ipAddress: '192.168.1.1',
               deviceType: 'mobile',
            },
         });
      });
   });

   describe('sendWelcomeEmail', () => {
      it('should emit welcome email', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));
         const registeredAt = new Date('2026-01-01T10:00:00.000Z');

         await adapter.sendWelcomeEmail({
            email: 'welcome@example.com',
            registeredAt,
         });

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            eventId: expect.any(String),
            to: 'welcome@example.com',
            subject: NOTIFICATION_EMAIL_SUBJECTS.WELCOME,
            template: NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
            data: {
               email: 'welcome@example.com',
               registeredAt,
            },
         });
      });
   });

   describe('sendEmail', () => {
      it('should emit generic email dto', async () => {
         mockNotificationClient.emit.mockReturnValue(of(true));

         await adapter.sendEmail({
            to: 'test@example.com',
            subject: 'Test Subject',
            html: '<p>Test content</p>',
            text: 'Test content',
         });

         expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            eventId: expect.any(String),
            to: 'test@example.com',
            subject: 'Test Subject',
            html: '<p>Test content</p>',
            text: 'Test content',
         });
      });
   });
});
