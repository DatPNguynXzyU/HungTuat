import { Module } from '@nestjs/common';
import { PrismaModule } from '@user/prisma';
import { UNIT_OF_WORK } from '@user/unit-of-work/unit-of-work.interface';
import { PrismaUnitOfWork } from '@user/unit-of-work/prisma-unit-of-work';

@Module({
   imports: [PrismaModule],
   providers: [
      PrismaUnitOfWork,
      {
         provide: UNIT_OF_WORK,
         useClass: PrismaUnitOfWork,
      },
   ],
   exports: [UNIT_OF_WORK, PrismaUnitOfWork],
})
export class UnitOfWorkModule {}
