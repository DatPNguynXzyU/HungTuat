import type { Prisma } from '@user/prisma-client';
import type { IUserProfileRepository } from '@user/repositories/user-profile.repository.interface';
import type { IFollowRepository } from '@user/repositories/follow.repository.interface';
import type { IOutboxRepository } from '@user/outbox/repositories/outbox.repository.interface';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Repositories scoped to an active database transaction.
 */
export interface IUnitOfWorkRepositories {
   readonly userProfileRepository: IUserProfileRepository;
   readonly followRepository: IFollowRepository;
   readonly outboxRepository: IOutboxRepository;
}

/**
 * Transaction configuration options.
 */
export interface TransactionOptions {
   isolationLevel?: Prisma.TransactionIsolationLevel;
   maxWait?: number;
   timeout?: number;
}

/**
 * Unit of Work interface managing the transaction lifecycle and ensuring
 * ACID transactional consistency across multiple repositories.
 */
export interface IUnitOfWork {
   /**
    * Executes a callback within an atomic database transaction.
    * If the callback resolves, all changes are committed automatically.
    * If an error is thrown, all changes are rolled back automatically.
    *
    * @param work Function taking the transactional repository instances
    * @param options Optional transaction settings (timeout, isolation level)
    */
   runInTransaction<T>(
      work: (repositories: IUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T>;

   /**
    * Returns the active transactional Prisma client if inside a transaction.
    */
   getCurrentTransaction(): Prisma.TransactionClient | undefined;
}
