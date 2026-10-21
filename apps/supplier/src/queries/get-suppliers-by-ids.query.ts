import { Command } from '@common';
import type { SupplierItemDto } from '@contracts/supplier';

export class GetSuppliersByIdsQuery extends Command<SupplierItemDto[]> {
   constructor(public readonly supplierIds: string[]) {
      super();
   }
}
