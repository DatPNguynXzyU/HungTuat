import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@commerce/prisma/prisma.service';
import { CategoryRepository } from '@commerce/repositories/category.repository';
import { IngredientRepository } from '@commerce/repositories/ingredient.repository';
import { SupplierProductRepository } from '@commerce/repositories/supplier-product.repository';
import type {
   ICommerceUnitOfWork,
   ICommerceUnitOfWorkRepositories,
   TransactionOptions,
} from '@commerce/unit-of-work/unit-of-work.interface';

@Injectable()
export class PrismaCommerceUnitOfWork implements ICommerceUnitOfWork {
   private readonly logger = new Logger(PrismaCommerceUnitOfWork.name);

   constructor(private readonly prisma: PrismaService) {}

   async runInTransaction<T>(
      work: (repositories: ICommerceUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T> {
      return this.prisma.$transaction(
         async (tx) => {
            const txPrisma = tx as unknown as PrismaService;
            const repositories: ICommerceUnitOfWorkRepositories = {
               categoryRepository: new CategoryRepository(txPrisma),
               ingredientRepository: new IngredientRepository(txPrisma),
               supplierProductRepository: new SupplierProductRepository(txPrisma),
            };

            return work(repositories);
         },
         {
            isolationLevel: options?.isolationLevel,
            maxWait: options?.maxWait,
            timeout: options?.timeout,
         },
      );
   }
}
