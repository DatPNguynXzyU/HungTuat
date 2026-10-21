import { Command } from '@common';
import type { RegisterSupplierDto, SupplierItemDto } from '@contracts/supplier';

export class RegisterSupplierCommand extends Command<SupplierItemDto> {
   constructor(
      public readonly dto: RegisterSupplierDto,
      public readonly userId?: string,
   ) {
      super();
   }
}
