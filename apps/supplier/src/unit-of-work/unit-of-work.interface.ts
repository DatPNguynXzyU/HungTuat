import type { Prisma } from '@supplier/prisma-client';
import type { ISupplierMemberRepository, ISupplierRepository } from '@supplier/repositories';

export const SUPPLIER_UNIT_OF_WORK = Symbol('SUPPLIER_UNIT_OF_WORK');

export interface ISupplierUnitOfWorkRepositories {
   readonly supplierRepository: ISupplierRepository;
   readonly supplierMemberRepository: ISupplierMemberRepository;
}

export interface TransactionOptions {
   isolationLevel?: Prisma.TransactionIsolationLevel;
   maxWait?: number;
   timeout?: number;
}

export interface ISupplierUnitOfWork {
   runInTransaction<T>(
      work: (repositories: ISupplierUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T>;
}
