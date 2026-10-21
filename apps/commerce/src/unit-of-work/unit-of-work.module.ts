import { Global, Module } from '@nestjs/common';
import { PrismaCommerceUnitOfWork } from '@commerce/unit-of-work/prisma-unit-of-work';
import { COMMERCE_UNIT_OF_WORK } from '@commerce/unit-of-work/unit-of-work.interface';

@Global()
@Module({
   providers: [
      PrismaCommerceUnitOfWork,
      {
         provide: COMMERCE_UNIT_OF_WORK,
         useExisting: PrismaCommerceUnitOfWork,
      },
   ],
   exports: [COMMERCE_UNIT_OF_WORK, PrismaCommerceUnitOfWork],
})
export class UnitOfWorkModule {}
