import type { Outbox, Prisma } from '@user/prisma-client';

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');

export interface CreateOutboxEventData {
   aggregateId: string;
   aggregateType: string;
   eventType: string;
   payload: Record<string, unknown>;
   eventId?: string;
}

export interface IOutboxRepository {
   create(data: CreateOutboxEventData, tx?: Prisma.TransactionClient): Promise<Outbox>;
   findPending(limit?: number): Promise<Outbox[]>;
   markAsProcessing(eventId: string): Promise<Outbox>;
   markAsPublished(eventId: string): Promise<Outbox>;
   markAsFailed(eventId: string, error: string): Promise<Outbox>;
}
