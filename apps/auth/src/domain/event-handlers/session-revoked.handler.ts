import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_DOMAIN_EVENTS, SessionRevokedEvent } from '@auth/domain/events';

@Injectable()
export class SessionRevokedEventHandler {
   private readonly logger = new Logger(SessionRevokedEventHandler.name);

   @OnEvent(AUTH_DOMAIN_EVENTS.SESSION_REVOKED, { async: true })
   handle(event: SessionRevokedEvent): void {
      this.logger.log(`Session revoked: ${event.sessionId} for account ${event.accountId} (reason: ${event.reason})`);
      // Future: Track session anomaly patterns, notify security monitoring
   }
}
