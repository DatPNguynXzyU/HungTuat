import type { AccountEntity, CreateAccountData } from '@auth/entities/account.entity';
import type { CreateOutboxEventData, OutboxEventEntity } from '@auth/outbox/entities/outbox-event.entity';
import type { Prisma } from '@auth/prisma-client';

export const OUTBOX_REPOSITORY = Symbol('OUTBOX_REPOSITORY');

export interface IOutboxRepository {
   create(data: CreateOutboxEventData, tx?: Prisma.TransactionClient): Promise<OutboxEventEntity>;
   createAccountWithEvent(accountData: CreateAccountData, event: CreateOutboxEventData): Promise<AccountEntity>;
   findPending(limit?: number): Promise<OutboxEventEntity[]>;
   markAsProcessing(eventIds: string[]): Promise<void>;
   markAsPublished(eventId: string): Promise<void>;
   markAsFailed(eventId: string, error: string, maxRetries?: number): Promise<void>;
   deleteByAggregateId(aggregateId: string): Promise<void>;
}
