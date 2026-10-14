import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { AppException } from '@common';
import {
   SendEmailDto,
   SendOtpEmailDto,
   SendResetPasswordEmailDto,
   SendVerificationEmailDto,
   SendWelcomeEmailDto,
   SendChangePasswordOtpEmailDto,
} from '@contracts/notification';
import { NotificationConfigService } from '@notification/config';
import { NOTIFICATION_ERROR_CODES } from '@notification/constants';
import { EmailTemplateService } from '@notification/services/email-template.service';

export interface SendEmailResult {
   id: string;
   to: string | string[];
   subject: string;
}

@Injectable()
export class ResendService {
   private readonly logger = new Logger(ResendService.name);
   private readonly resend: Resend;

   constructor(
      private readonly configService: NotificationConfigService,
      private readonly templateService: EmailTemplateService,
   ) {
      const apiKey = this.configService.resendToken;
      this.resend = new Resend(apiKey);
   }

   async sendEmail(dto: SendEmailDto): Promise<SendEmailResult> {
      try {
         const from = dto.from || this.configService.defaultSender;
         const to = Array.isArray(dto.to) ? dto.to : [dto.to];

         this.logger.log(`Sending email to ${to.join(', ')} with subject: "${dto.subject}"`);

         const basePayload = {
            from,
            to,
            subject: dto.subject,
            ...(dto.replyTo ? { replyTo: dto.replyTo } : {}),
            ...(dto.cc ? { cc: dto.cc } : {}),
            ...(dto.bcc ? { bcc: dto.bcc } : {}),
         };

         const payload = dto.html
            ? { ...basePayload, html: dto.html, ...(dto.text ? { text: dto.text } : {}) }
            : { ...basePayload, text: dto.text || '' };

         const { data, error } = await this.resend.emails.send(payload);

         if (error) {
            this.logger.error(`Resend error sending email: ${error.name} - ${error.message}`);
            throw new AppException({
               errorCode: NOTIFICATION_ERROR_CODES.EMAIL_SEND_FAILED,
               message: `Failed to send email via Resend: ${error.message}`,
               statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
               details: { errorName: error.name, errorMessage: error.message },
            });
         }

         const emailId = data?.id ?? '';
         this.logger.log(`Email sent successfully with ID: ${emailId}`);

         return {
            id: emailId,
            to: dto.to,
            subject: dto.subject,
         };
      } catch (err: unknown) {
         if (err instanceof AppException) {
            throw err;
         }
         const message = err instanceof Error ? err.message : String(err);
         this.logger.error(`Unexpected error sending email: ${message}`);
         throw new AppException({
            errorCode: NOTIFICATION_ERROR_CODES.EMAIL_SEND_FAILED,
            message,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
         });
      }
   }

   async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<SendEmailResult> {
      const { html, text } = this.templateService.renderWelcomeEmail({
         fullName: dto.fullName,
         actionUrl: dto.actionUrl,
      });

      return this.sendEmail({
         to: dto.to,
         subject: 'Welcome to OmniServices!',
         html,
         text,
      });
   }

   async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<SendEmailResult> {
      const { html, text } = this.templateService.renderVerificationEmail({
         fullName: dto.fullName,
         verificationUrl: dto.verificationUrl,
         token: dto.token,
      });

      return this.sendEmail({
         to: dto.to,
         subject: 'Verify Your Email Address - OmniServices',
         html,
         text,
      });
   }

   async sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<SendEmailResult> {
      const { html, text } = this.templateService.renderResetPasswordEmail({
         fullName: dto.fullName,
         resetUrl: dto.resetUrl,
         token: dto.token,
      });

      return this.sendEmail({
         to: dto.to,
         subject: 'Reset Your Password - OmniServices',
         html,
         text,
      });
   }

   async sendOtpEmail(dto: SendOtpEmailDto): Promise<SendEmailResult> {
      const { html, text } = this.templateService.renderOtpEmail({
         fullName: dto.fullName,
         otpCode: dto.otpCode,
         expiresInMinutes: dto.expiresInMinutes,
      });

      return this.sendEmail({
         to: dto.to,
         subject: `${dto.otpCode} is your OmniServices verification code`,
         html,
         text,
      });
   }

   async sendChangePasswordOtpEmail(dto: SendChangePasswordOtpEmailDto): Promise<SendEmailResult> {
      const { html, text } = this.templateService.renderChangePasswordOtpEmail({
         fullName: dto.fullName,
         otpCode: dto.otpCode,
         expiresInMinutes: dto.expiresInMinutes,
      });

      return this.sendEmail({
         to: dto.to,
         subject: `${dto.otpCode} is your password change verification code`,
         html,
         text,
      });
   }
}
