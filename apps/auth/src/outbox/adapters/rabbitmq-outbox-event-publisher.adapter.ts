import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { firstValueFrom } from 'rxjs';
import type { IOutboxEventPublisher } from '@auth/outbox/adapters/outbox-event-publisher.interface';

/**
 * RabbitMQ implementation of IOutboxEventPublisher.
 * Dispatches integration events to notification, user, and supplier services via RabbitMQ ClientProxy.
 */
@Injectable()
export class RabbitMqOutboxEventPublisher implements IOutboxEventPublisher {
   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      @Inject(SERVICES.USER_SERVICE)
      private readonly userClient: ClientProxy,
      @Inject(SERVICES.SUPPLIER_SERVICE)
      private readonly supplierClient: ClientProxy,
   ) {}

   async publish(eventType: string, payload: unknown): Promise<void> {
      if (eventType === NOTIFICATION_EVENTS.SUPPLIER_REGISTERED) {
         await Promise.allSettled([
            firstValueFrom(this.notificationClient.emit(eventType, payload)),
            firstValueFrom(this.supplierClient.emit(eventType, payload)),
         ]);
         return;
      }

      await Promise.allSettled([
         firstValueFrom(this.notificationClient.emit(eventType, payload)),
         firstValueFrom(this.userClient.emit(eventType, payload)),
      ]);
   }
}
