import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import {
   NOTIFICATION_EMAIL_SUBJECTS,
   NOTIFICATION_PATTERNS,
   NOTIFICATION_TEMPLATES,
   type SendEmailDto,
} from '@contracts/notification';
import { firstValueFrom } from 'rxjs';
import type {
   INotificationAdapter,
   PasswordChangedNotificationData,
   SecurityAlertNotificationData,
   WelcomeEmailNotificationData,
} from '@auth/adapters/notification/notification.adapter.interface';

/**
 * RabbitMQ Adapter implementing INotificationAdapter.
 * Encapsulates NestJS microservices ClientProxy transport, patterns, and RxJS Observable conversion.
 */
@Injectable()
export class RabbitMqNotificationAdapter implements INotificationAdapter {
   private readonly logger = new Logger(RabbitMqNotificationAdapter.name);

   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
   ) {}

   async sendRegistrationOtp(email: string, otpCode: string, expiresInMinutes: number): Promise<void> {
      try {
         await firstValueFrom(
            this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_OTP_EMAIL, {
               to: email,
               otpCode,
               expiresInMinutes,
            }),
         );
      } catch (error) {
         this.logger.error(`Failed to emit registration OTP email to ${email}`, error);
      }
   }

   async sendChangePasswordOtp(email: string, otpCode: string, expiresInMinutes: number): Promise<void> {
      try {
         await firstValueFrom(
            this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_CHANGE_PASSWORD_OTP_EMAIL, {
               to: email,
               otpCode,
               expiresInMinutes,
            }),
         );
      } catch (error) {
         this.logger.error(`Failed to emit change password OTP email to ${email}`, error);
      }
   }

   async sendSecurityAlert(data: SecurityAlertNotificationData): Promise<void> {
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: data.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.ACCOUNT_LOCKED,
            template: NOTIFICATION_TEMPLATES.SECURITY_ALERT_ACCOUNT_LOCKED,
            data: {
               email: data.email,
               ipAddress: data.ipAddress,
               lockedUntil: data.lockedUntil,
               failedAttempts: data.failedAttempts,
            },
         }),
      );
   }

   async sendPasswordChangedConfirmation(data: PasswordChangedNotificationData): Promise<void> {
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: data.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.PASSWORD_CHANGED,
            template: NOTIFICATION_TEMPLATES.PASSWORD_CHANGED,
            data: {
               email: data.email,
               changedAt: data.changedAt,
               ipAddress: data.ipAddress,
               deviceType: data.deviceType,
            },
         }),
      );
   }

   async sendWelcomeEmail(data: WelcomeEmailNotificationData): Promise<void> {
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: data.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.WELCOME,
            template: NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
            data: {
               email: data.email,
               registeredAt: data.registeredAt,
            },
         }),
      );
   }

   async sendEmail(dto: SendEmailDto): Promise<void> {
      await firstValueFrom(this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, dto));
   }
}
