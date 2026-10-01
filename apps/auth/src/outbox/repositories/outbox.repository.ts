import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { CreateOutboxEventData, OutboxEventEntity } from '@auth/outbox/entities/outbox-event.entity';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';
import { type OutboxEvent, type Prisma, OutboxStatus } from '@auth/prisma-client';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
   constructor(private readonly prisma: PrismaService) {}

   private toEntity(event: OutboxEvent): OutboxEventEntity {
      return {
         id: event.id,
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
      const id = data.id || uuidv7();
      const event = await client.outboxEvent.create({
         data: {
            id,
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

   async markAsProcessing(ids: string[]): Promise<void> {
      if (ids.length === 0) return;
      await this.prisma.outboxEvent.updateMany({
         where: { id: { in: ids } },
         data: { status: OutboxStatus.PROCESSING },
      });
   }

   async markAsPublished(id: string): Promise<void> {
      await this.prisma.outboxEvent.update({
         where: { id },
         data: {
            status: OutboxStatus.PUBLISHED,
            processedAt: new Date(),
            lastError: null,
         },
      });
   }

   async markAsFailed(id: string, error: string, maxRetries = 5): Promise<void> {
      const event = await this.prisma.outboxEvent.findUnique({ where: { id } });
      if (!event) return;

      const newRetryCount = event.retryCount + 1;
      const nextStatus = newRetryCount >= maxRetries ? OutboxStatus.FAILED : OutboxStatus.PENDING;

      await this.prisma.outboxEvent.update({
         where: { id },
         data: {
            status: nextStatus,
            retryCount: newRetryCount,
            lastError: error.slice(0, 1000),
            ...(nextStatus === OutboxStatus.FAILED ? { processedAt: new Date() } : {}),
         },
      });
   }
}
