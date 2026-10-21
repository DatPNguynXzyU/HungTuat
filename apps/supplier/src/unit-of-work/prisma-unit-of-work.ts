import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@supplier/prisma/prisma.service';
import { SupplierRepository } from '@supplier/repositories/supplier.repository';
import { SupplierMemberRepository } from '@supplier/repositories/supplier-member.repository';
import type {
   ISupplierUnitOfWork,
   ISupplierUnitOfWorkRepositories,
   TransactionOptions,
} from '@supplier/unit-of-work/unit-of-work.interface';

@Injectable()
export class PrismaSupplierUnitOfWork implements ISupplierUnitOfWork {
   private readonly logger = new Logger(PrismaSupplierUnitOfWork.name);

   constructor(private readonly prisma: PrismaService) {}

   async runInTransaction<T>(
      work: (repositories: ISupplierUnitOfWorkRepositories) => Promise<T>,
      options?: TransactionOptions,
   ): Promise<T> {
      return this.prisma.$transaction(
         async (tx) => {
            const txPrisma = tx as unknown as PrismaService;
            const repositories: ISupplierUnitOfWorkRepositories = {
               supplierRepository: new SupplierRepository(txPrisma),
               supplierMemberRepository: new SupplierMemberRepository(txPrisma),
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
