import { Module } from '@nestjs/common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxService } from '@user/core/outbox/outbox.service';
import { OutboxRepository, OUTBOX_REPOSITORY } from '@user/core/outbox/repositories';

@Module({
   imports: [PrismaModule],
   providers: [
      OutboxRepository,
      {
         provide: OUTBOX_REPOSITORY,
         useClass: OutboxRepository,
      },
      OutboxService,
   ],
   exports: [OutboxRepository, OUTBOX_REPOSITORY, OutboxService],
})
export class OutboxModule {}
