import { Module } from '@nestjs/common';
import { PrismaModule } from '@user/prisma';
import { OutboxService } from '@user/outbox/outbox.service';

@Module({
   imports: [PrismaModule],
   providers: [OutboxService],
   exports: [OutboxService],
})
export class OutboxModule {}
