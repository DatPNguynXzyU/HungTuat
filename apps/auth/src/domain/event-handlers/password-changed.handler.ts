import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES, SERVICES } from '@common';
import { firstValueFrom } from 'rxjs';
import { AUTH_DOMAIN_EVENTS, PasswordChangedEvent } from '@auth/domain/events';

@Injectable()
export class PasswordChangedEventHandler {
   private readonly logger = new Logger(PasswordChangedEventHandler.name);

   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
   ) {}

   @OnEvent(AUTH_DOMAIN_EVENTS.PASSWORD_CHANGED, { async: true })
   async handle(event: PasswordChangedEvent): Promise<void> {
      this.logger.log(`Password changed for account ${event.accountId}`);

      try {
         await this.sendPasswordChangeConfirmation(event);
         this.logger.log(`Password change confirmation email triggered for account ${event.accountId}`);
      } catch (error) {
         this.logger.error('Failed to handle password changed event', error);
         // Event handler failures do not affect main flow
      }
   }

   private async sendPasswordChangeConfirmation(event: PasswordChangedEvent): Promise<void> {
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: event.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.PASSWORD_CHANGED,
            template: NOTIFICATION_TEMPLATES.PASSWORD_CHANGED,
            data: {
               email: event.email,
               changedAt: event.changedAt,
               ipAddress: event.ipAddress,
               deviceType: event.deviceInfo?.deviceType,
            },
         }),
      );
   }
}
