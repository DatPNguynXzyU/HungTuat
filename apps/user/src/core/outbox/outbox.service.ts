import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService } from '@user/core/database/prisma';
import { OutboxStatus, Prisma } from '@user/prisma-client';

@Injectable()
export class OutboxService {
   constructor(private readonly prisma: PrismaService) {}

   async createOutboxEvent(
      aggregateId: string,
      aggregateType: string,
      eventType: string,
      payload: Record<string, unknown>,
      tx?: Prisma.TransactionClient,
   ) {
      const client = tx ?? this.prisma;
      return client.outbox.create({
         data: {
            eventId: uuidv7(),
            aggregateId,
            aggregateType,
            eventType,
            payload: JSON.stringify(payload),
            status: OutboxStatus.PENDING,
         },
      });
   }

   async getPendingEvents(limit = 100) {
      return this.prisma.outbox.findMany({
         where: {
            status: OutboxStatus.PENDING,
         },
         orderBy: {
            createdAt: 'asc',
         },
         take: limit,
      });
   }

   async markAsProcessing(eventId: string) {
      return this.prisma.outbox.update({
         where: { eventId },
         data: { status: OutboxStatus.PROCESSING },
      });
   }

   async markAsPublished(eventId: string) {
      return this.prisma.outbox.update({
         where: { eventId },
         data: {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
         },
      });
   }

   async markAsFailed(eventId: string, error: string) {
      return this.prisma.outbox.update({
         where: { eventId },
         data: {
            status: OutboxStatus.FAILED,
            error,
            retryCount: {
               increment: 1,
            },
         },
      });
   }

   async deletePublishedEvents(olderThanDays = 7) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      return this.prisma.outbox.deleteMany({
         where: {
            status: OutboxStatus.PUBLISHED,
            publishedAt: {
               lt: cutoffDate,
            },
         },
      });
   }
}
