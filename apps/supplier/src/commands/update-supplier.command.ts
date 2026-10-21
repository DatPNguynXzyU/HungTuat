import { Command } from '@common';
import type { SupplierItemDto, UpdateSupplierDto } from '@contracts/supplier';

export class UpdateSupplierCommand extends Command<SupplierItemDto> {
   constructor(
      public readonly supplierId: string,
      public readonly dto: UpdateSupplierDto,
   ) {
      super();
   }
}
