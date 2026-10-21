import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { COMMERCE_ERROR_CODES, SUPPLIER_STATUS } from '@contracts/commerce';
import type { SupplierEntity } from '@commerce/entities/supplier.entity';

@Injectable()
export class SupplierActiveSpecification extends Specification<SupplierEntity> {
   protected readonly errorCode = COMMERCE_ERROR_CODES.SUPPLIER_NOT_ACTIVE;

   isSatisfiedBy(candidate: SupplierEntity): boolean {
      if (!candidate) {
         return false;
      }
      if (candidate.deletedAt) {
         return false;
      }
      return candidate.supplierStatus === SUPPLIER_STATUS.ACTIVE;
   }
}
