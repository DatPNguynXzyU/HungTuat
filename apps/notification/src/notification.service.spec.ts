import { Test, TestingModule } from '@nestjs/testing';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUS, NOTIFICATION_TEMPLATES } from '@common';
import { NotificationService } from '@notification/notification.service';
import { PrismaService } from '@notification/prisma/prisma.service';
import { ResendService } from '@notification/services/resend.service';

describe('NotificationService', () => {
   let service: NotificationService;
   let mockSendEmail: jest.Mock;
   let mockSendWelcomeEmail: jest.Mock;
   let mockSendVerificationEmail: jest.Mock;
   let mockSendResetPasswordEmail: jest.Mock;
   let mockSendOtpEmail: jest.Mock;
   let mockPrisma: {
      notificationLog: {
         create: jest.Mock;
         update: jest.Mock;
      };
   };

   beforeEach(async () => {
      mockSendEmail = jest.fn().mockResolvedValue({ id: 'msg_1', to: 'a@b.com', subject: 'test' });
      mockSendWelcomeEmail = jest.fn().mockResolvedValue({ id: 'msg_2', to: 'a@b.com', subject: 'welcome' });
      mockSendVerificationEmail = jest.fn().mockResolvedValue({ id: 'msg_3', to: 'a@b.com', subject: 'verify' });
      mockSendResetPasswordEmail = jest.fn().mockResolvedValue({ id: 'msg_4', to: 'a@b.com', subject: 'reset' });
      mockSendOtpEmail = jest.fn().mockResolvedValue({ id: 'msg_5', to: 'a@b.com', subject: 'otp' });

      mockPrisma = {
         notificationLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_1' }),
            update: jest.fn().mockResolvedValue({ id: 'log_1', status: NOTIFICATION_STATUS.SENT }),
         },
      };

      const mockResendService = {
         sendEmail: mockSendEmail,
         sendWelcomeEmail: mockSendWelcomeEmail,
         sendVerificationEmail: mockSendVerificationEmail,
         sendResetPasswordEmail: mockSendResetPasswordEmail,
         sendOtpEmail: mockSendOtpEmail,
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            NotificationService,
            {
               provide: ResendService,
               useValue: mockResendService,
            },
            {
               provide: PrismaService,
               useValue: mockPrisma,
            },
         ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);
   });

   it('should forward sendEmail to ResendService and record log in database', async () => {
      const dto = { to: 'a@b.com', subject: 'test', html: '<p>Hi</p>' };
      const res = await service.sendEmail(dto);
      expect(res.id).toBe('msg_1');
      expect(mockSendEmail).toHaveBeenCalledWith(dto);
      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(
         expect.objectContaining({
            data: expect.objectContaining({
               recipient: 'a@b.com',
               channel: NOTIFICATION_CHANNELS.EMAIL,
               template: NOTIFICATION_TEMPLATES.CUSTOM_EMAIL,
               status: NOTIFICATION_STATUS.PENDING,
            }) as unknown,
         }) as unknown,
      );
      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith(
         expect.objectContaining({
            where: { id: 'log_1' },
            data: expect.objectContaining({
               status: NOTIFICATION_STATUS.SENT,
            }) as unknown,
         }) as unknown,
      );
   });

   it('should forward sendWelcomeEmail to ResendService and log', async () => {
      const dto = { to: 'a@b.com', fullName: 'User' };
      const res = await service.sendWelcomeEmail(dto, 'evt-1');
      expect(res.id).toBe('msg_2');
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(dto);
      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith(
         expect.objectContaining({
            data: expect.objectContaining({
               eventId: 'evt-1',
               recipient: 'a@b.com',
               template: NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
            }) as unknown,
         }) as unknown,
      );
   });

   it('should forward sendVerificationEmail to ResendService', async () => {
      const dto = { to: 'a@b.com', fullName: 'User', verificationUrl: 'http://url' };
      const res = await service.sendVerificationEmail(dto);
      expect(res.id).toBe('msg_3');
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(dto);
   });

   it('should forward sendResetPasswordEmail to ResendService', async () => {
      const dto = { to: 'a@b.com', fullName: 'User', resetUrl: 'http://url' };
      const res = await service.sendResetPasswordEmail(dto);
      expect(res.id).toBe('msg_4');
      expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(dto);
   });

   it('should forward sendOtpEmail to ResendService', async () => {
      const dto = { to: 'a@b.com', otpCode: '123456' };
      const res = await service.sendOtpEmail(dto);
      expect(res.id).toBe('msg_5');
      expect(mockSendOtpEmail).toHaveBeenCalledWith(dto);
   });

   it('should mark log as FAILED when sending email fails', async () => {
      mockSendEmail.mockRejectedValue(new Error('Resend failed'));
      await expect(service.sendEmail({ to: 'fail@b.com', subject: 'fail', html: '<p>fail</p>' })).rejects.toThrow(
         'Resend failed',
      );
      expect(mockPrisma.notificationLog.update).toHaveBeenCalledWith(
         expect.objectContaining({
            where: { id: 'log_1' },
            data: expect.objectContaining({
               status: NOTIFICATION_STATUS.FAILED,
               errorMessage: 'Resend failed',
            }) as unknown,
         }) as unknown,
      );
   });
});
