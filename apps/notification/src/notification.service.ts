import { Injectable, Logger, Optional } from '@nestjs/common';
import {
   NOTIFICATION_CHANNELS,
   NOTIFICATION_STATUS,
   NOTIFICATION_TEMPLATES,
   SendEmailDto,
   SendOtpEmailDto,
   SendResetPasswordEmailDto,
   SendSupplierWelcomeEmailDto,
   SendVerificationEmailDto,
   SendWelcomeEmailDto,
   SendChangePasswordOtpEmailDto,
} from '@contracts/notification';
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

      if (this.prisma && eventId) {
         try {
            const existingLog = await this.prisma.notificationLog.findUnique({
               where: { eventId },
            });

            // 1. If notification was already sent successfully, idempotent return (skip sending duplicate email)
            if (existingLog?.status === NOTIFICATION_STATUS.SENT) {
               this.logger.log(
                  `[Idempotency Guard] Notification for eventId ${eventId} already sent (logId: ${existingLog.notificationLogId}). Skipping duplicate dispatch.`,
               );
               return {
                  id: existingLog.notificationLogId,
                  to: recipient,
                  subject: typeof payload.subject === 'string' ? payload.subject : template,
               };
            }

            // 2. If previously failed or pending, reset status to PENDING for retry
            if (existingLog) {
               const updated = await this.prisma.notificationLog.update({
                  where: { eventId },
                  data: {
                     status: NOTIFICATION_STATUS.PENDING,
                     errorMessage: null,
                     payload: payload as Prisma.InputJsonValue,
                  },
               });
               logId = updated.notificationLogId;
            }
         } catch (lookupErr: unknown) {
            const msg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
            this.logger.warn(`Could not check existing notification log for eventId ${eventId}: ${msg}`);
         }
      }

      // If record not yet tracked and logId not set, create initial log record
      if (this.prisma && !logId) {
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
            logId = log.notificationLogId;
         } catch (createErr: unknown) {
            // Handle race condition: concurrent message may have inserted eventId
            if (eventId) {
               try {
                  const concurrentLog = await this.prisma.notificationLog.findUnique({
                     where: { eventId },
                  });
                  if (concurrentLog?.status === NOTIFICATION_STATUS.SENT) {
                     this.logger.log(
                        `[Idempotency Guard] Concurrent notification for eventId ${eventId} already completed. Skipping duplicate dispatch.`,
                     );
                     return {
                        id: concurrentLog.notificationLogId,
                        to: recipient,
                        subject: typeof payload.subject === 'string' ? payload.subject : template,
                     };
                  }
                  if (concurrentLog) {
                     logId = concurrentLog.notificationLogId;
                  }
               } catch {
                  // Ignore secondary lookup errors
               }
            }
            if (!logId) {
               const msg = createErr instanceof Error ? createErr.message : String(createErr);
               this.logger.warn(`Could not create notification log in DB: ${msg}`);
            }
         }
      }

      try {
         const result = await action();
         if (this.prisma && logId) {
            await this.prisma.notificationLog
               .update({
                  where: { notificationLogId: logId },
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
                  where: { notificationLogId: logId },
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

   async sendEmail(dto: SendEmailDto, eventId?: string): Promise<SendEmailResult> {
      const recipient = Array.isArray(dto.to) ? dto.to.join(',') : dto.to;
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing custom email notification to: ${recipient}`);
      return this.logNotification(
         recipient,
         NOTIFICATION_TEMPLATES.CUSTOM_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendEmail(dto),
         resolvedEventId,
      );
   }

   async sendWelcomeEmail(dto: SendWelcomeEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing welcome email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendWelcomeEmail(dto),
         resolvedEventId,
      );
   }

   async sendSupplierWelcomeEmail(dto: SendSupplierWelcomeEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing supplier welcome email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.SUPPLIER_WELCOME_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendSupplierWelcomeEmail(dto),
         resolvedEventId,
      );
   }

   async sendVerificationEmail(dto: SendVerificationEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing verification email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.VERIFICATION_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendVerificationEmail(dto),
         resolvedEventId,
      );
   }

   async sendResetPasswordEmail(dto: SendResetPasswordEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing reset password email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.RESET_PASSWORD_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendResetPasswordEmail(dto),
         resolvedEventId,
      );
   }

   async sendOtpEmail(dto: SendOtpEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing OTP email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.OTP_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendOtpEmail(dto),
         resolvedEventId,
      );
   }

   async sendChangePasswordOtpEmail(dto: SendChangePasswordOtpEmailDto, eventId?: string): Promise<SendEmailResult> {
      const resolvedEventId = eventId ?? dto.eventId;
      this.logger.log(`Processing change password OTP email notification for: ${dto.to}`);
      return this.logNotification(
         dto.to,
         NOTIFICATION_TEMPLATES.CHANGE_PASSWORD_OTP_EMAIL,
         dto as unknown as Record<string, unknown>,
         () => this.resendService.sendChangePasswordOtpEmail(dto),
         resolvedEventId,
      );
   }
}
