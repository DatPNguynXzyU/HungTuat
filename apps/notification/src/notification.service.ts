import { Injectable, Logger } from '@nestjs/common';
import {
   SendEmailDto,
   SendOtpEmailDto,
   SendResetPasswordEmailDto,
   SendVerificationEmailDto,
   SendWelcomeEmailDto,
} from '@common';
import { ResendService, SendEmailResult } from '@notification/services/resend.service';

@Injectable()
export class NotificationService {
   private readonly logger = new Logger(NotificationService.name);

   constructor(private readonly resendService: ResendService) {}

   async sendEmail(dto: SendEmailDto): Promise<SendEmailResult> {
      this.logger.log(`Processing custom email notification to: ${Array.isArray(dto.to) ? dto.to.join(',') : dto.to}`);
      return this.resendService.sendEmail(dto);
   }

   async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<SendEmailResult> {
      this.logger.log(`Processing welcome email notification for: ${dto.to}`);
      return this.resendService.sendWelcomeEmail(dto);
   }

   async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<SendEmailResult> {
      this.logger.log(`Processing verification email notification for: ${dto.to}`);
      return this.resendService.sendVerificationEmail(dto);
   }

   async sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<SendEmailResult> {
      this.logger.log(`Processing reset password email notification for: ${dto.to}`);
      return this.resendService.sendResetPasswordEmail(dto);
   }

   async sendOtpEmail(dto: SendOtpEmailDto): Promise<SendEmailResult> {
      this.logger.log(`Processing OTP email notification for: ${dto.to}`);
      return this.resendService.sendOtpEmail(dto);
   }
}
