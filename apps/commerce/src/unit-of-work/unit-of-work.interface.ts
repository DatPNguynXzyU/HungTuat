import type { Prisma } from '@commerce/prisma-client';
import type {
   ICategoryRepository,
   IIngredientRepository,
   ISupplierProductRepository,
   ISupplierRepository,
} from '@commerce/repositories';

export const COMMERCE_UNIT_OF_WORK = Symbol('COMMERCE_UNIT_OF_WORK');

export interface ICommerceUnitOfWorkRepositories {
   readonly categoryRepository: ICategoryRepository;
   readonly ingredientRepository: IIngredientRepository;
   readonly supplierRepository: ISupplierRepository;
   readonly supplierProductRepository: ISupplierProductRepository;
}

export interface TransactionOptions {
   isolationLevel?: Prisma.TransactionIsolationLevel;
   maxWait?: number;
   timeout?: number;
}

export interface ICommerceUnitOfWork {
   runInTransaction<T>(
      work: (repositories: ICommerceUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T>;
}
