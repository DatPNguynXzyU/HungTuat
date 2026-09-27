import { EmailTemplateService } from '@notification/services/email-template.service';

describe('EmailTemplateService', () => {
   let service: EmailTemplateService;

   beforeEach(() => {
      service = new EmailTemplateService();
   });

   it('should render welcome email', () => {
      const result = service.renderWelcomeEmail({
         fullName: 'John Doe',
         actionUrl: 'https://app.example.com',
      });

      expect(result.html).toContain('Welcome aboard, John Doe!');
      expect(result.html).toContain('https://app.example.com');
      expect(result.text).toContain('Welcome aboard, John Doe!');
   });

   it('should render verification email', () => {
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

   it('should render reset password email', () => {
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

   it('should render OTP email', () => {
      const result = service.renderOtpEmail({
         fullName: 'Bob',
         otpCode: '654321',
         expiresInMinutes: 5,
      });

      expect(result.html).toContain('654321');
      expect(result.html).toContain('5 minutes');
      expect(result.text).toContain('654321');
   });
});
