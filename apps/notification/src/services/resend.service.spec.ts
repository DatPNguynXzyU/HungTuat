import { Test, TestingModule } from '@nestjs/testing';
import { Resend } from 'resend';
import { AppException } from '@common';
import { NotificationConfigService } from '@notification/config';
import { TranslationService } from '@notification/i18n';
import { EmailTemplateService } from '@notification/services/email-template.service';
import { ResendService } from '@notification/services/resend.service';

jest.mock('resend');

describe('ResendService', () => {
   let service: ResendService;
   let mockSend: jest.Mock;

   const mockConfigService = {
      resendToken: 're_test_token',
      emailFrom: 'noreply@omniservices.dev',
      emailFromName: 'OmniServices',
      defaultSender: 'OmniServices <noreply@omniservices.dev>',
      appUrl: 'https://app.omniservices.dev',
   };

   beforeEach(async () => {
      mockSend = jest.fn();
      (Resend as unknown as jest.Mock).mockImplementation(() => ({
         emails: {
            send: mockSend,
         },
      }));

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ResendService,
            TranslationService,
            EmailTemplateService,
            {
               provide: NotificationConfigService,
               useValue: mockConfigService,
            },
         ],
      }).compile();

      service = module.get<ResendService>(ResendService);
   });

   afterEach(() => {
      jest.clearAllMocks();
   });

   it('should send an email successfully', async () => {
      mockSend.mockResolvedValue({
         data: { id: 'email_123' },
         error: null,
      });

      const result = await service.sendEmail({
         to: 'user@example.com',
         subject: 'Test Subject',
         html: '<p>Hello</p>',
      });

      expect(result).toEqual({
         id: 'email_123',
         to: 'user@example.com',
         subject: 'Test Subject',
      });
      expect(mockSend).toHaveBeenCalledWith({
         from: 'OmniServices <noreply@omniservices.dev>',
         to: ['user@example.com'],
         subject: 'Test Subject',
         html: '<p>Hello</p>',
         text: undefined,
         replyTo: undefined,
         cc: undefined,
         bcc: undefined,
      });
   });

   it('should throw AppException if Resend returns an error', async () => {
      mockSend.mockResolvedValue({
         data: null,
         error: { name: 'validation_error', message: 'Invalid recipient' },
      });

      await expect(
         service.sendEmail({
            to: 'invalid-email',
            subject: 'Test',
            html: '<p>Hello</p>',
         }),
      ).rejects.toThrow(AppException);
   });

   it('should send welcome email', async () => {
      mockSend.mockResolvedValue({
         data: { id: 'welcome_123' },
         error: null,
      });

      const result = await service.sendWelcomeEmail({
         to: 'newuser@example.com',
         fullName: 'New User',
         actionUrl: 'https://app.example.com',
      });

      expect(result.id).toBe('welcome_123');
      expect(mockSend).toHaveBeenCalled();
   });

   it('should send verification email', async () => {
      mockSend.mockResolvedValue({
         data: { id: 'verify_123' },
         error: null,
      });

      const result = await service.sendVerificationEmail({
         to: 'verify@example.com',
         fullName: 'Verify User',
         verificationUrl: 'https://app.example.com/verify?token=123',
      });

      expect(result.id).toBe('verify_123');
      expect(mockSend).toHaveBeenCalled();
   });

   it('should send reset password email', async () => {
      mockSend.mockResolvedValue({
         data: { id: 'reset_123' },
         error: null,
      });

      const result = await service.sendResetPasswordEmail({
         to: 'reset@example.com',
         fullName: 'Reset User',
         resetUrl: 'https://app.example.com/reset?token=abc',
      });

      expect(result.id).toBe('reset_123');
      expect(mockSend).toHaveBeenCalled();
   });

   it('should send OTP email', async () => {
      mockSend.mockResolvedValue({
         data: { id: 'otp_123' },
         error: null,
      });

      const result = await service.sendOtpEmail({
         to: 'otp@example.com',
         otpCode: '123456',
         fullName: 'OTP User',
         expiresInMinutes: 10,
      });

      expect(result.id).toBe('otp_123');
      expect(mockSend).toHaveBeenCalled();
   });
});
