import { Command } from '@common';
import type { SupplierItemDto } from '@contracts/supplier';

export class VerifySupplierCommand extends Command<SupplierItemDto> {
   constructor(
      public readonly supplierId: string,
      public readonly isVerified: boolean,
   ) {
      super();
   }
}
