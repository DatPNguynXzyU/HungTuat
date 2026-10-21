import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { OFFER_STATUS, type IngredientSuppliersResponseDto } from '@contracts/commerce';
import { SupplierOfferService } from '@commerce/services';
import { GetSuppliersByIngredientQuery } from '@commerce/queries/get-suppliers-by-ingredient.query';

@Injectable()
@CommandHandler(GetSuppliersByIngredientQuery)
export class GetSuppliersByIngredientHandler implements ICommandHandler<
   GetSuppliersByIngredientQuery,
   IngredientSuppliersResponseDto
> {
   constructor(private readonly supplierOfferService: SupplierOfferService) {}

   async execute(query: GetSuppliersByIngredientQuery): Promise<IngredientSuppliersResponseDto> {
      const res = await this.supplierOfferService.getSuppliersByIngredient(query.ingredientId, query.inStockOnly);

      return {
         ingredientId: res.ingredientId,
         ingredientName: res.ingredientName,
         offers: res.offers.map((offer) => ({
            productId: offer.productId,
            supplierId: offer.supplierId,
            ingredientId: offer.ingredientId,
            productSku: offer.productSku,
            productTitle: offer.productTitle,
            price: offer.price,
            currency: offer.currency,
            originalPrice: offer.originalPrice || undefined,
            packageSize: offer.packageSize || undefined,
            stockQuantity: offer.stockQuantity,
            inStock: offer.offerStatus === OFFER_STATUS.AVAILABLE && offer.stockQuantity > 0,
            productUrl: offer.productUrl || undefined,
            productImageUrl: offer.productImageUrl || undefined,
            offerStatus: offer.offerStatus,
            supplier: offer.supplier
               ? {
                    supplierId: offer.supplier.supplierId,
                    supplierName: offer.supplier.supplierName,
                    supplierSlug: offer.supplier.supplierSlug,
                    supplierCode: offer.supplier.supplierCode,
                    contactEmail: offer.supplier.contactEmail || undefined,
                    contactPhone: offer.supplier.contactPhone || undefined,
                    address: offer.supplier.address || undefined,
                    city: offer.supplier.city || undefined,
                    rating: offer.supplier.rating,
                    isVerified: offer.supplier.isVerified,
                    supplierStatus: offer.supplier.supplierStatus,
                    supplierLogoUrl: offer.supplier.supplierLogoUrl || undefined,
                 }
               : undefined,
         })),
         totalOffers: res.totalOffers,
      };
   }
}
