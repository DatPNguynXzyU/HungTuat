import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OnEvent } from '@nestjs/event-emitter';
import { NOTIFICATION_EMAIL_SUBJECTS, NOTIFICATION_PATTERNS, NOTIFICATION_TEMPLATES, SERVICES } from '@common';
import { firstValueFrom } from 'rxjs';
import { AUTH_DOMAIN_EVENTS, AccountLockedEvent } from '@auth/domain/events';

@Injectable()
export class AccountLockedEventHandler {
   private readonly logger = new Logger(AccountLockedEventHandler.name);

   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
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
      await firstValueFrom(
         this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND_EMAIL, {
            to: event.email,
            subject: NOTIFICATION_EMAIL_SUBJECTS.ACCOUNT_LOCKED,
            template: NOTIFICATION_TEMPLATES.SECURITY_ALERT_ACCOUNT_LOCKED,
            data: {
               email: event.email,
               ipAddress: event.ipAddress,
               lockedUntil: event.lockedUntil,
               failedAttempts: event.failedAttempts,
            },
         }),
      );
   }
}
