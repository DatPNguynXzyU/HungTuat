import { Command } from '@common';
import type { SupplierItemDto } from '@contracts/supplier';

export class GetSupplierByIdQuery extends Command<SupplierItemDto> {
   constructor(public readonly supplierId: string) {
      super();
   }
}
