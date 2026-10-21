import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@supplier/prisma';
import { SUPPLIER_UNIT_OF_WORK } from '@supplier/unit-of-work/unit-of-work.interface';
import { PrismaSupplierUnitOfWork } from '@supplier/unit-of-work/prisma-unit-of-work';

@Global()
@Module({
   imports: [PrismaModule],
   providers: [
      PrismaSupplierUnitOfWork,
      {
         provide: SUPPLIER_UNIT_OF_WORK,
         useExisting: PrismaSupplierUnitOfWork,
      },
   ],
   exports: [SUPPLIER_UNIT_OF_WORK, PrismaSupplierUnitOfWork],
})
export class UnitOfWorkModule {}
