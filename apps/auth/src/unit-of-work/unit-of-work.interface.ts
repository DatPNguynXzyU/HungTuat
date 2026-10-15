import type { Prisma } from '@auth/prisma-client';
import type { IAccountRepository, IAuditLogRepository, IRbacRepository, ISessionRepository } from '@auth/repositories';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Repositories scoped to an active database transaction.
 */
export interface IUnitOfWorkRepositories {
   readonly accountRepository: IAccountRepository;
   readonly rbacRepository: IRbacRepository;
   readonly sessionRepository: ISessionRepository;
   readonly auditLogRepository: IAuditLogRepository;
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
}
