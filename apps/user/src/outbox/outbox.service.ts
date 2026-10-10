import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService } from '@user/prisma';
import { OutboxStatus } from '@user/prisma-client';

@Injectable()
export class OutboxService {
   constructor(private readonly prisma: PrismaService) {}

   async createOutboxEvent(
      aggregateId: string,
      aggregateType: string,
      eventType: string,
      payload: Record<string, unknown>,
   ) {
      return this.prisma.outbox.create({
         data: {
            id: uuidv7(),
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

   async markAsProcessing(id: string) {
      return this.prisma.outbox.update({
         where: { id },
         data: { status: OutboxStatus.PROCESSING },
      });
   }

   async markAsPublished(id: string) {
      return this.prisma.outbox.update({
         where: { id },
         data: {
            status: OutboxStatus.PUBLISHED,
            publishedAt: new Date(),
         },
      });
   }

   async markAsFailed(id: string, error: string) {
      return this.prisma.outbox.update({
         where: { id },
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
