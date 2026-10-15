import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_DOMAIN_EVENTS, AccountLockedEvent } from '@auth/domain/events';
import { NOTIFICATION_ADAPTER, type INotificationAdapter } from '@auth/adapters';

@Injectable()
export class AccountLockedEventHandler {
   private readonly logger = new Logger(AccountLockedEventHandler.name);

   constructor(
      @Inject(NOTIFICATION_ADAPTER)
      private readonly notificationAdapter: INotificationAdapter,
   ) {}

   @OnEvent(AUTH_DOMAIN_EVENTS.ACCOUNT_LOCKED, { async: true })
   async handle(event: AccountLockedEvent): Promise<void> {
      this.logger.warn(`Account locked: ${event.email} from ${event.ipAddress} (${event.failedAttempts} attempts)`);

      try {
         await this.sendSecurityAlert(event);
         this.logger.log(`Security alert email triggered successfully for ${event.email}`);
      } catch (error) {
         this.logger.error('Failed to handle account locked event', error);
         // Event handler failures do not affect main flow
      }
   }

   private async sendSecurityAlert(event: AccountLockedEvent): Promise<void> {
      await this.notificationAdapter.sendSecurityAlert({
         email: event.email,
         ipAddress: event.ipAddress,
         lockedUntil: event.lockedUntil,
         failedAttempts: event.failedAttempts,
      });
   }
}
