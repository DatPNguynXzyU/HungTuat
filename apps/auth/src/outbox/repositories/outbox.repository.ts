import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import type { AccountEntity, CreateAccountData } from '@auth/entities/account.entity';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { CreateOutboxEventData, OutboxEventEntity } from '@auth/outbox/entities/outbox-event.entity';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';
import {
   type Account,
   type AccountStatus,
   type OutboxEvent,
   type Prisma,
   type Role,
   OutboxStatus,
} from '@auth/prisma-client';

type AccountWithRoles = Account & {
   accountRoles?: Array<{
      role: Role;
   }>;
};

@Injectable()
export class OutboxRepository implements IOutboxRepository {
   constructor(private readonly prisma: PrismaService) {}

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

   private toAccountEntity(account: AccountWithRoles): AccountEntity {
      return {
         id: account.accountId,
         email: account.email,
         phoneNumber: account.phoneNumber,
         passwordHash: account.passwordHash,
         status: account.status,
         isEmailVerified: account.isEmailVerified,
         lastLoginAt: account.lastLoginAt ? account.lastLoginAt.toISOString() : null,
         version: account.version,
         deletedAt: account.deletedAt ? account.deletedAt.toISOString() : null,
         roles: account.accountRoles ? account.accountRoles.map((ur) => ur.role.code) : [],
         createdAt: account.createdAt.toISOString(),
         updatedAt: account.updatedAt.toISOString(),
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

   async createAccountWithEvent(accountData: CreateAccountData, event: CreateOutboxEventData): Promise<AccountEntity> {
      const accountId = accountData.id || uuidv7();

      const account = await this.prisma.$transaction(async (tx) => {
         const createdAccount = await tx.account.create({
            data: {
               accountId,
               email: accountData.email,
               phoneNumber: accountData.phoneNumber,
               passwordHash: accountData.passwordHash,
               status: accountData.status as AccountStatus,
               isEmailVerified: accountData.isEmailVerified,
               createdAt: accountData.createdAt ? new Date(accountData.createdAt) : undefined,
               accountRoles: accountData.roleId
                  ? {
                       create: [
                          {
                             roleId: accountData.roleId,
                          },
                       ],
                    }
                  : undefined,
            },
            include: {
               accountRoles: {
                  include: {
                     role: true,
                  },
               },
            },
         });

         await tx.outboxEvent.create({
            data: {
               eventId: event.eventId || uuidv7(),
               aggregateType: event.aggregateType,
               aggregateId: event.aggregateId || accountId,
               eventType: event.eventType,
               payload: {
                  ...event.payload,
                  accountId,
               },
               status: OutboxStatus.PENDING,
            },
         });

         return createdAccount;
      });

      return this.toAccountEntity(account);
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
