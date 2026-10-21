import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { COMMERCE_ERROR_CODES, OFFER_STATUS } from '@contracts/commerce';
import type { SupplierProductEntity } from '@commerce/entities/supplier-product.entity';

@Injectable()
export class ProductInStockSpecification extends Specification<SupplierProductEntity> {
   protected readonly errorCode = COMMERCE_ERROR_CODES.PRODUCT_OUT_OF_STOCK;

   isSatisfiedBy(candidate: SupplierProductEntity): boolean {
      if (!candidate) {
         return false;
      }
      if (candidate.deletedAt) {
         return false;
      }
      return candidate.offerStatus === OFFER_STATUS.AVAILABLE && candidate.stockQuantity > 0;
   }
}
