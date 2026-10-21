import type { SupplierEntity } from '@supplier/entities/supplier.entity';

export class SupplierVerifiedSpecification {
   static isSatisfiedBy(supplier: SupplierEntity | null | undefined): boolean {
      if (!supplier) {
         return false;
      }
      return supplier.isVerified && !supplier.deletedAt;
   }
}
