import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService, type PrismaClientOrTransaction } from '@auth/prisma';
import type { CreateOutboxEventData, OutboxEventEntity } from '@auth/outbox/entities/outbox-event.entity';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';
import { type OutboxEvent, type Prisma, OutboxStatus } from '@auth/prisma-client';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
   constructor(@Inject(PrismaService) private readonly prisma: PrismaClientOrTransaction) {}

   private toEntity(event: OutboxEvent): OutboxEventEntity {
      return {
         eventId: event.eventId,
         aggregateType: event.aggregateType,
         aggregateId: event.aggregateId,
         eventType: event.eventType,
         payload: event.payload as Record<string, unknown>,
         status: event.status,
         retryCount: event.retryCount,
         lastError: event.lastError,
         processedAt: event.processedAt ? event.processedAt.toISOString() : null,
         createdAt: event.createdAt.toISOString(),
         updatedAt: event.updatedAt.toISOString(),
      };
   }

   async create(data: CreateOutboxEventData, tx?: Prisma.TransactionClient): Promise<OutboxEventEntity> {
      const client = tx || this.prisma;
      const id = data.eventId || uuidv7();
      const event = await client.outboxEvent.create({
         data: {
            eventId: id,
            aggregateType: data.aggregateType,
            aggregateId: data.aggregateId || id,
            eventType: data.eventType,
            payload: data.payload as Prisma.InputJsonValue,
            status: OutboxStatus.PENDING,
         },
      });

      return this.toEntity(event);
   }

   async findPending(limit = 50): Promise<OutboxEventEntity[]> {
      const events = await this.prisma.outboxEvent.findMany({
         where: {
            status: {
               in: [OutboxStatus.PENDING, OutboxStatus.PROCESSING],
            },
         },
         orderBy: {
            createdAt: 'asc',
         },
         take: limit,
      });

      return events.map((e) => this.toEntity(e));
   }

   async markAsProcessing(eventIds: string[]): Promise<void> {
      if (eventIds.length === 0) return;
      await this.prisma.outboxEvent.updateMany({
         where: { eventId: { in: eventIds } },
         data: { status: OutboxStatus.PROCESSING },
      });
   }

   async markAsPublished(eventId: string): Promise<void> {
      await this.prisma.outboxEvent.update({
         where: { eventId },
         data: {
            status: OutboxStatus.PUBLISHED,
            processedAt: new Date(),
            lastError: null,
         },
      });
   }

   async markAsFailed(eventId: string, error: string, maxRetries = 5): Promise<void> {
      const event = await this.prisma.outboxEvent.findUnique({ where: { eventId } });
      if (!event) return;

      const newRetryCount = event.retryCount + 1;
      const nextStatus = newRetryCount >= maxRetries ? OutboxStatus.FAILED : OutboxStatus.PENDING;

      await this.prisma.outboxEvent.update({
         where: { eventId },
         data: {
            status: nextStatus,
            retryCount: newRetryCount,
            lastError: error.slice(0, 1000),
            ...(nextStatus === OutboxStatus.FAILED ? { processedAt: new Date() } : {}),
         },
      });
   }

   async deleteByAggregateId(aggregateId: string): Promise<void> {
      await this.prisma.outboxEvent.deleteMany({
         where: { aggregateId },
      });
   }
}
