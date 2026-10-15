import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import { firstValueFrom } from 'rxjs';
import type { IOutboxEventPublisher } from '@auth/outbox/adapters/outbox-event-publisher.interface';

/**
 * RabbitMQ implementation of IOutboxEventPublisher.
 * Dispatches integration events to notification and user services via RabbitMQ ClientProxy.
 */
@Injectable()
export class RabbitMqOutboxEventPublisher implements IOutboxEventPublisher {
   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      @Inject(SERVICES.USER_SERVICE)
      private readonly userClient: ClientProxy,
   ) {}

   async publish(eventType: string, payload: unknown): Promise<void> {
      await Promise.allSettled([
         firstValueFrom(this.notificationClient.emit(eventType, payload)),
         firstValueFrom(this.userClient.emit(eventType, payload)),
      ]);
   }
}
