import { Module } from '@nestjs/common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxService } from '@user/core/outbox/outbox.service';

@Module({
   imports: [PrismaModule],
   providers: [OutboxService],
   exports: [OutboxService],
})
export class OutboxModule {}
