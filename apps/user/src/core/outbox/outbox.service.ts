import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@user/core/database/prisma';
import { OutboxStatus, type Prisma } from '@user/prisma-client';
import { OUTBOX_REPOSITORY, type IOutboxRepository } from '@user/core/outbox/repositories/outbox.repository.interface';

@Injectable()
export class OutboxService {
   constructor(
      @Inject(OUTBOX_REPOSITORY)
      private readonly outboxRepository: IOutboxRepository,
      private readonly prisma: PrismaService,
   ) {}

   async createOutboxEvent(
      aggregateId: string,
      aggregateType: string,
      eventType: string,
      payload: Record<string, unknown>,
      tx?: Prisma.TransactionClient,
   ) {
      return this.outboxRepository.create(
         {
            aggregateId,
            aggregateType,
            eventType,
            payload,
         },
         tx,
      );
   }

   async getPendingEvents(limit = 100) {
      return this.outboxRepository.findPending(limit);
   }

   async markAsProcessing(eventId: string) {
      return this.outboxRepository.markAsProcessing(eventId);
   }

   async markAsPublished(eventId: string) {
      return this.outboxRepository.markAsPublished(eventId);
   }

   async markAsFailed(eventId: string, error: string) {
      return this.outboxRepository.markAsFailed(eventId, error);
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
