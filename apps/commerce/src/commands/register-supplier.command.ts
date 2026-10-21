import { Command } from '@common';
import type { RegisterSupplierDto, SupplierItemDto } from '@contracts/commerce';

export class RegisterSupplierCommand extends Command<SupplierItemDto> {
   constructor(public readonly dto: RegisterSupplierDto) {
      super();
   }
}
