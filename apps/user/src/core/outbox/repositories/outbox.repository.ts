import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService, type PrismaClientOrTransaction } from '@user/core/database/prisma';
import { OutboxStatus, type Outbox, type Prisma } from '@user/prisma-client';
import type {
   CreateOutboxEventData,
   IOutboxRepository,
} from '@user/core/outbox/repositories/outbox.repository.interface';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
   constructor(@Inject(PrismaService) private readonly prisma: PrismaClientOrTransaction) {}

   async create(data: CreateOutboxEventData, tx?: Prisma.TransactionClient): Promise<Outbox> {
      const client = tx ?? this.prisma;
      return client.outbox.create({
         data: {
            eventId: data.eventId ?? uuidv7(),
            aggregateId: data.aggregateId,
            aggregateType: data.aggregateType,
            eventType: data.eventType,
            payload: JSON.stringify(data.payload),
            status: OutboxStatus.PENDING,
         },
      });
   }

   async findPending(limit = 100): Promise<Outbox[]> {
      return this.prisma.outbox.findMany({
         where: { status: OutboxStatus.PENDING },
         orderBy: { createdAt: 'asc' },
         take: limit,
      });
   }

   async markAsProcessing(eventId: string): Promise<Outbox> {
      return this.prisma.outbox.update({
         where: { eventId },
         data: { status: OutboxStatus.PROCESSING },
      });
   }

   async markAsPublished(eventId: string): Promise<Outbox> {
      return this.prisma.outbox.update({
         where: { eventId },
         data: {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
         },
      });
   }

   async markAsFailed(eventId: string, error: string): Promise<Outbox> {
      return this.prisma.outbox.update({
         where: { eventId },
         data: {
            status: OutboxStatus.FAILED,
            error,
            retryCount: { increment: 1 },
         },
      });
   }
}
