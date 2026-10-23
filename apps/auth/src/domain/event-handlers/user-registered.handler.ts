import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_DOMAIN_EVENTS, UserRegisteredEvent } from '@auth/domain/events';
import { NOTIFICATION_ADAPTER, type INotificationAdapter } from '@auth/adapters';

@Injectable()
export class UserRegisteredEventHandler {
   private readonly logger = new Logger(UserRegisteredEventHandler.name);

   constructor(
      @Inject(NOTIFICATION_ADAPTER)
      private readonly notificationAdapter: INotificationAdapter,
   ) {}

   @OnEvent(AUTH_DOMAIN_EVENTS.USER_REGISTERED, { async: true })
   async handle(event: UserRegisteredEvent): Promise<void> {
      this.logger.log(`Handling user registered event for ${event.email}`);

      try {
         await this.sendWelcomeEmail(event);
         this.logger.log(`Welcome email triggered successfully for ${event.email}`);
      } catch (error) {
         this.logger.error(`Failed to handle user registered event for ${event.email}`, error);
         // Event handler failures do not affect main flow
      }
   }

   private async sendWelcomeEmail(event: UserRegisteredEvent): Promise<void> {
      await this.notificationAdapter.sendWelcomeEmail({
         email: event.email,
         registeredAt: event.registeredAt,
      });
   }
}
