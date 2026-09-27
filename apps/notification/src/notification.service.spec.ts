import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '@notification/notification.service';
import { ResendService } from '@notification/services/resend.service';

describe('NotificationService', () => {
   let service: NotificationService;
   let mockSendEmail: jest.Mock;
   let mockSendWelcomeEmail: jest.Mock;
   let mockSendVerificationEmail: jest.Mock;
   let mockSendResetPasswordEmail: jest.Mock;
   let mockSendOtpEmail: jest.Mock;

   beforeEach(async () => {
      mockSendEmail = jest.fn().mockResolvedValue({ id: 'msg_1', to: 'a@b.com', subject: 'test' });
      mockSendWelcomeEmail = jest.fn().mockResolvedValue({ id: 'msg_2', to: 'a@b.com', subject: 'welcome' });
      mockSendVerificationEmail = jest.fn().mockResolvedValue({ id: 'msg_3', to: 'a@b.com', subject: 'verify' });
      mockSendResetPasswordEmail = jest.fn().mockResolvedValue({ id: 'msg_4', to: 'a@b.com', subject: 'reset' });
      mockSendOtpEmail = jest.fn().mockResolvedValue({ id: 'msg_5', to: 'a@b.com', subject: 'otp' });

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
         ],
      }).compile();

      service = module.get<NotificationService>(NotificationService);
   });

   it('should forward sendEmail to ResendService', async () => {
      const dto = { to: 'a@b.com', subject: 'test', html: '<p>Hi</p>' };
      const res = await service.sendEmail(dto);
      expect(res.id).toBe('msg_1');
      expect(mockSendEmail).toHaveBeenCalledWith(dto);
   });

   it('should forward sendWelcomeEmail to ResendService', async () => {
      const dto = { to: 'a@b.com', fullName: 'User' };
      const res = await service.sendWelcomeEmail(dto);
      expect(res.id).toBe('msg_2');
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(dto);
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
});
