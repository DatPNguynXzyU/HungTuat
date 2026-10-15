import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_DOMAIN_EVENTS, PasswordChangedEvent } from '@auth/domain/events';
import { NOTIFICATION_ADAPTER, type INotificationAdapter } from '@auth/adapters';

@Injectable()
export class PasswordChangedEventHandler {
   private readonly logger = new Logger(PasswordChangedEventHandler.name);

   constructor(
      @Inject(NOTIFICATION_ADAPTER)
      private readonly notificationAdapter: INotificationAdapter,
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
      await this.notificationAdapter.sendPasswordChangedConfirmation({
         email: event.email,
         changedAt: event.changedAt,
         ipAddress: event.ipAddress,
         deviceType: event.deviceInfo?.deviceType,
      });
   }
}
