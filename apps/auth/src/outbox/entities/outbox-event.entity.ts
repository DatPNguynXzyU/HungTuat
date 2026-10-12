import type { SetOptional } from '@common';

export const OUTBOX_STATUS = {
   PENDING: 'PENDING',
   PROCESSING: 'PROCESSING',
   PUBLISHED: 'PUBLISHED',
   FAILED: 'FAILED',
} as const;

export type OutboxStatusType = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS];

export interface OutboxEventEntity {
   eventId: string;
   aggregateType: string;
   aggregateId: string;
   eventType: string;
   payload: Record<string, unknown>;
   status: OutboxStatusType;
   retryCount: number;
   lastError?: string | null;
   processedAt?: string | null;
   createdAt: string;
   updatedAt: string;
}

export type CreateOutboxEventData = SetOptional<
   Omit<OutboxEventEntity, 'status' | 'retryCount' | 'lastError' | 'processedAt' | 'createdAt' | 'updatedAt'>,
   'eventId' | 'aggregateId'
>;
