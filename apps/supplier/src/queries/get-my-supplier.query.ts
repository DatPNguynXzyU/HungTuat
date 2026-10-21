import { Command } from '@common';
import type { SupplierItemDto } from '@contracts/supplier';

export interface MySupplierQueryResult {
   hasSupplier: boolean;
   supplier: SupplierItemDto | null;
   role?: string;
   memberStatus?: string;
}

export class GetMySupplierQuery extends Command<MySupplierQueryResult> {
   constructor(public readonly accountId: string) {
      super();
   }
}
