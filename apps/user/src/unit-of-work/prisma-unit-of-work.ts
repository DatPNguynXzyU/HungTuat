import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@user/prisma-client';
import { PrismaService } from '@user/prisma/prisma.service';
import { UserProfileRepository } from '@user/repositories/user-profile.repository';
import { FollowRepository } from '@user/repositories/follow.repository';
import { OutboxRepository } from '@user/outbox/repositories/outbox.repository';
import type {
   IUnitOfWork,
   IUnitOfWorkRepositories,
   TransactionOptions,
} from '@user/unit-of-work/unit-of-work.interface';

@Injectable()
export class PrismaUnitOfWork implements IUnitOfWork {
   private readonly logger = new Logger(PrismaUnitOfWork.name);
   private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

   constructor(private readonly prisma: PrismaService) {}

   /**
    * Returns the active transactional Prisma client if inside a transaction.
    */
   getCurrentTransaction(): Prisma.TransactionClient | undefined {
      return this.als.getStore();
   }

   /**
    * Executes the provided work within an atomic database transaction.
    */
   async runInTransaction<T>(
      work: (repositories: IUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T> {
      const activeTx = this.als.getStore();
      if (activeTx) {
         this.logger.debug('Reusing active transaction context');
         const repositories = this.createRepositories(activeTx);
         return await work(repositories);
      }

      const startTime = Date.now();
      this.logger.debug('Starting new database transaction');

      try {
         return await this.prisma.$transaction(
            async (tx) => {
               return await this.als.run(tx, async () => {
                  const repositories = this.createRepositories(tx);
                  return await work(repositories);
               });
            },
            {
               isolationLevel: options?.isolationLevel,
               maxWait: options?.maxWait,
               timeout: options?.timeout,
            },
         );
      } catch (error) {
         const duration = Date.now() - startTime;
         this.logger.warn(
            `Transaction rolled back after ${duration}ms due to error: ${error instanceof Error ? error.message : String(error)}`,
         );
         throw error;
      } finally {
         const duration = Date.now() - startTime;
         this.logger.debug(`Transaction completed in ${duration}ms`);
      }
   }

   private createRepositories(tx: Prisma.TransactionClient): IUnitOfWorkRepositories {
      return {
         userProfileRepository: new UserProfileRepository(tx),
         followRepository: new FollowRepository(tx),
         outboxRepository: new OutboxRepository(tx),
      };
   }
}
