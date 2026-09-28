export type OutboxStatusType = 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventEntity {
   id: string;
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

export interface CreateOutboxEventData {
   id?: string;
   aggregateType: string;
   aggregateId?: string;
   eventType: string;
   payload: Record<string, unknown>;
}
