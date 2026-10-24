import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@auth/prisma';
import { OUTBOX_REPOSITORY } from '@auth/outbox/repositories/outbox.repository.interface';
import { OutboxRepository } from '@auth/outbox/repositories/outbox.repository';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import { OUTBOX_EVENT_PUBLISHER } from '@auth/outbox/adapters/outbox-event-publisher.interface';
import { RabbitMqOutboxEventPublisher } from '@auth/outbox/adapters/rabbitmq-outbox-event-publisher.adapter';

@Module({
   imports: [
      PrismaModule,
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.USER_SERVICE,
      }),
   ],
   providers: [
      {
         provide: OUTBOX_REPOSITORY,
         useClass: OutboxRepository,
      },
      OutboxRepository,
      {
         provide: OUTBOX_EVENT_PUBLISHER,
         useClass: RabbitMqOutboxEventPublisher,
      },
      RabbitMqOutboxEventPublisher,
      OutboxPublisherService,
   ],
   exports: [
      OUTBOX_REPOSITORY,
      OutboxRepository,
      OUTBOX_EVENT_PUBLISHER,
      RabbitMqOutboxEventPublisher,
      OutboxPublisherService,
   ],
})
export class OutboxModule {}
