import { Injectable, Logger, Optional } from '@nestjs/common';
import {
   NOTIFICATION_CHANNELS,
   NOTIFICATION_STATUS,
   NOTIFICATION_TEMPLATES,
   SendEmailDto,
   SendOtpEmailDto,
   SendResetPasswordEmailDto,
   SendVerificationEmailDto,
   SendWelcomeEmailDto,
} from '@common';
import { PrismaService } from '@notification/prisma/prisma.service';
import { ResendService, SendEmailResult } from '@notification/services/resend.service';
import type { Prisma } from '@notification/prisma-client';

@Injectable()
export class NotificationService {
   private readonly logger = new Logger(NotificationService.name);

   constructor(
      private readonly resendService: ResendService,
      @Optional() private readonly prisma?: PrismaService,
   ) {}

   private async logNotification(
      recipient: string,
      template: string,
      payload: Record<string, unknown>,
      action: () => Promise<SendEmailResult>,
      eventId?: string,
   ): Promise<SendEmailResult> {
      let logId: string | null = null;
      if (this.prisma) {
         try {
            const log = await this.prisma.notificationLog.create({
               data: {
                  eventId,
                  recipient,
                  channel: NOTIFICATION_CHANNELS.EMAIL,
                  template,
                  payload: payload as Prisma.InputJsonValue,
                  status: NOTIFICATION_STATUS.PENDING,
               },
            });
            logId = log.id;
         } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Could not create notification log in DB: ${msg}`);
         }
      }

      try {
         const result = await action();
         if (this.prisma && logId) {
            await this.prisma.notificationLog
               .update({
                  where: { id: logId },
                  data: {
                     status: NOTIFICATION_STATUS.SENT,
                     sentAt: new Date(),
                  },
               })
               .catch(() => undefined);
         }
         return result;
      } catch (err: unknown) {
         const errMsg = err instanceof Error ? err.message : String(err);
         if (this.prisma && logId) {
            await this.prisma.notificationLog
               .update({
                  where: { id: logId },
                  data: {
                     status: NOTIFICATION_STATUS.FAILED,
                     errorMessage: errMsg.slice(0, 1000),
                  },
               })
               .catch(() => undefined);
         }
         throw err;
      }
   }

   async sendEmail(dto: SendEmailDto): Promise<SendEmailResult> {
      const recipient = Array.isArray(dto.to) ? dto.to.join(',') : dto.to;
      this.logger.log(`Processing custom email notification to: ${recipient}`);
      return this.logNotification(
         recipient,
         NOTIFICATION_TEMPLATES.CUSTOM_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendEmail(dto),
      );
   }

   async sendWelcomeEmail(dto: SendWelcomeEmailDto, eventId?: string): Promise<SendEmailResult> {
      this.logger.log(`Processing welcome email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendWelcomeEmail(dto),
         eventId,
      );
   }

   async sendVerificationEmail(dto: SendVerificationEmailDto, eventId?: string): Promise<SendEmailResult> {
      this.logger.log(`Processing verification email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.VERIFICATION_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendVerificationEmail(dto),
         eventId,
      );
   }

   async sendResetPasswordEmail(dto: SendResetPasswordEmailDto, eventId?: string): Promise<SendEmailResult> {
      this.logger.log(`Processing reset password email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.RESET_PASSWORD_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendResetPasswordEmail(dto),
         eventId,
      );
   }

   async sendOtpEmail(dto: SendOtpEmailDto, eventId?: string): Promise<SendEmailResult> {
      this.logger.log(`Processing OTP email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.OTP_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendOtpEmail(dto),
         eventId,
      );
   }
}
