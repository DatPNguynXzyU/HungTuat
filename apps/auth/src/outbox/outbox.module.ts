import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@auth/prisma';
import { OUTBOX_REPOSITORY } from '@auth/outbox/repositories/outbox.repository.interface';
import { OutboxRepository } from '@auth/outbox/repositories/outbox.repository';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';

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
      OutboxPublisherService,
   ],
   exports: [OUTBOX_REPOSITORY, OutboxRepository, OutboxPublisherService],
})
export class OutboxModule {}
