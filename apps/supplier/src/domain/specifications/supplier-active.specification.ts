import { SUPPLIER_STATUS } from '@contracts/supplier';
import type { SupplierEntity } from '@supplier/entities/supplier.entity';

export class SupplierActiveSpecification {
   static isSatisfiedBy(supplier: SupplierEntity | null | undefined): boolean {
      if (!supplier) {
         return false;
      }
      return supplier.supplierStatus === SUPPLIER_STATUS.ACTIVE && !supplier.deletedAt;
   }
}
