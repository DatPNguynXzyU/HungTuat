import { Command } from '@common';
import type { SupplierMemberEntity } from '@supplier/entities';

export interface HandleSupplierRegisteredData {
   accountId: string;
   email: string;
   role?: string;
}

export class HandleSupplierRegisteredCommand extends Command<SupplierMemberEntity | null> {
   constructor(public readonly data: HandleSupplierRegisteredData) {
      super();
   }
}
