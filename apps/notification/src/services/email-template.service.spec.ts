import { NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { Locale, TranslationService } from '@notification/i18n';
import { EmailTemplateService } from '@notification/services/email-template.service';

describe('EmailTemplateService', () => {
   let service: EmailTemplateService;
   let translationService: TranslationService;

   beforeEach(() => {
      translationService = new TranslationService();
      service = new EmailTemplateService(translationService);
   });

   describe('Welcome Email', () => {
      it('should render welcome email in English by default', () => {
         const result = service.renderWelcomeEmail({
            fullName: 'John Doe',
            actionUrl: 'https://app.example.com',
         });

         expect(result.html).toContain('Welcome aboard, John Doe!');
         expect(result.html).toContain('https://app.example.com');
         expect(result.text).toContain('Welcome aboard, John Doe!');
      });

      it('should render welcome email in Vietnamese when locale is VI', () => {
         const result = service.renderWelcomeEmail(
            {
               fullName: 'Nguyen Van A',
               actionUrl: 'https://app.example.com',
            },
            Locale.VI,
         );

         expect(result.html).toContain('Chào mừng bạn, Nguyen Van A!');
         expect(result.html).toContain('Bắt Đầu');
         expect(result.text).toContain('Chào mừng bạn, Nguyen Van A!');
      });
   });

   describe('Supplier Welcome Email', () => {
      it('should render supplier welcome email in English by default', () => {
         const result = service.renderSupplierWelcomeEmail({
            fullName: 'Tech Corp Partner',
            supplierName: 'Tech Corp Ltd',
            actionUrl: 'https://supplier.example.com',
         });

         expect(result.html).toContain('Welcome to the Partner Network, Tech Corp Ltd!');
         expect(result.html).toContain('SUPPLIER ONBOARDING');
         expect(result.html).toContain('1. Complete Company Profile');
         expect(result.html).toContain('Go to Supplier Portal');
         expect(result.html).toContain('https://supplier.example.com');
         expect(result.text).toContain('Welcome to the Partner Network, Tech Corp Ltd!');
      });

      it('should render supplier welcome email in Vietnamese when locale is VI', () => {
         const result = service.renderSupplierWelcomeEmail(
            {
               fullName: 'Công Ty ABC',
               actionUrl: 'https://supplier.example.com',
            },
            Locale.VI,
         );

         expect(result.html).toContain('Chào mừng đối tác, Công Ty ABC!');
         expect(result.html).toContain('CHÀO MỪNG ĐỐI TÁC');
         expect(result.html).toContain('1. Hoàn tất hồ sơ doanh nghiệp');
         expect(result.html).toContain('Truy Cập Kênh Người Bán');
         expect(result.text).toContain('Chào mừng đối tác, Công Ty ABC!');
      });

      it('should render supplier welcome email via Strategy Pattern renderTemplate', () => {
         const result = service.renderTemplate(NOTIFICATION_TEMPLATES.SUPPLIER_WELCOME_EMAIL, {
            fullName: 'Partner X',
            actionUrl: 'https://supplier.example.com/onboard',
         });

         expect(result.html).toContain('Welcome to the Partner Network, Partner X!');
         expect(result.html).toContain('https://supplier.example.com/onboard');
      });
   });

   describe('Verification Email', () => {
      it('should render verification email in English', () => {
         const result = service.renderVerificationEmail({
            fullName: 'Jane Doe',
            verificationUrl: 'https://app.example.com/verify?token=123',
            token: '123',
         });

         expect(result.html).toContain('Verify your email address');
         expect(result.html).toContain('Jane Doe');
         expect(result.html).toContain('https://app.example.com/verify?token=123');
         expect(result.text).toContain('Jane Doe');
      });

      it('should render verification email in Vietnamese', () => {
         const result = service.renderVerificationEmail(
            {
               fullName: 'Jane Doe',
               verificationUrl: 'https://app.example.com/verify?token=123',
               token: '123',
            },
            Locale.VI,
         );

         expect(result.html).toContain('Xác minh địa chỉ email');
         expect(result.html).toContain('Xác Minh Email');
         expect(result.text).toContain('Xác minh địa chỉ email');
      });
   });

   describe('Reset Password Email', () => {
      it('should render reset password email in English', () => {
         const result = service.renderResetPasswordEmail({
            fullName: 'Alice',
            resetUrl: 'https://app.example.com/reset?token=abc',
            token: 'abc',
         });

         expect(result.html).toContain('Reset your password');
         expect(result.html).toContain('Alice');
         expect(result.html).toContain('https://app.example.com/reset?token=abc');
         expect(result.text).toContain('Alice');
      });

      it('should render reset password email in Vietnamese', () => {
         const result = service.renderResetPasswordEmail(
            {
               fullName: 'Alice',
               resetUrl: 'https://app.example.com/reset?token=abc',
               token: 'abc',
            },
            Locale.VI,
         );

         expect(result.html).toContain('Đặt lại mật khẩu');
         expect(result.html).toContain('Đặt Lại Mật Khẩu');
         expect(result.text).toContain('Đặt lại mật khẩu');
      });
   });

   describe('OTP Email', () => {
      it('should render OTP email in English', () => {
         const result = service.renderOtpEmail({
            fullName: 'Bob',
            otpCode: '654321',
            expiresInMinutes: 5,
         });

         expect(result.html).toContain('654321');
         expect(result.html).toContain('5 minutes');
         expect(result.text).toContain('654321');
      });

      it('should render OTP email in Vietnamese', () => {
         const result = service.renderOtpEmail(
            {
               fullName: 'Bob',
               otpCode: '654321',
               expiresInMinutes: 5,
            },
            Locale.VI,
         );

         expect(result.html).toContain('654321');
         expect(result.html).toContain('Hết hạn sau 5 phút');
         expect(result.text).toContain('654321');
      });
   });

   describe('Change Password OTP Email', () => {
      it('should render change password OTP email in English', () => {
         const result = service.renderChangePasswordOtpEmail({
            fullName: 'Charlie',
            otpCode: '987654',
            expiresInMinutes: 10,
         });

         expect(result.html).toContain('987654');
         expect(result.html).toContain('Verify Your Password Change');
         expect(result.text).toContain('987654');
      });

      it('should render change password OTP email in Vietnamese', () => {
         const result = service.renderChangePasswordOtpEmail(
            {
               fullName: 'Charlie',
               otpCode: '987654',
               expiresInMinutes: 10,
            },
            Locale.VI,
         );

         expect(result.html).toContain('987654');
         expect(result.html).toContain('Xác Minh Thay Đổi Mật Khẩu');
         expect(result.text).toContain('987654');
      });
   });
});
