import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OnEvent } from '@nestjs/event-emitter';
import { SERVICES } from '@common';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES } from '@contracts/notification';
import { firstValueFrom } from 'rxjs';
import { AUTH_DOMAIN_EVENTS, UserRegisteredEvent } from '@auth/domain/events';

@Injectable()
export class UserRegisteredEventHandler {
   private readonly logger = new Logger(UserRegisteredEventHandler.name);

   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
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
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: event.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.WELCOME,
            template: NOTIFICATION_TEMPLATES.WELCOME_EMAIL,
            data: {
               email: event.email,
               registeredAt: event.registeredAt,
            },
         }),
      );
   }
}
