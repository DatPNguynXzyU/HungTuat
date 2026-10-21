import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { CurrencyEnum, OFFER_STATUS } from '@contracts/commerce';
import { IngredientCatalogService } from '@commerce/services';
import {
   GetIngredientDetailQuery,
   type IngredientDetailsResponse,
} from '@commerce/queries/get-ingredient-detail.query';

@Injectable()
@CommandHandler(GetIngredientDetailQuery)
export class GetIngredientDetailHandler implements ICommandHandler<
   GetIngredientDetailQuery,
   IngredientDetailsResponse
> {
   constructor(private readonly ingredientCatalogService: IngredientCatalogService) {}

   async execute(query: GetIngredientDetailQuery): Promise<IngredientDetailsResponse> {
      const res = await this.ingredientCatalogService.getIngredientById(query.ingredientId);
      const prices = res.offers.map((o) => o.price);

      return {
         ingredient: {
            ingredientId: res.ingredient.ingredientId,
            ingredientName: res.ingredient.ingredientName,
            normalizedName: res.ingredient.normalizedName,
            ingredientSlug: res.ingredient.ingredientSlug,
            ingredientDescription: res.ingredient.ingredientDescription,
            ingredientImageUrl: res.ingredient.ingredientImageUrl,
            categoryId: res.ingredient.categoryId,
            categoryName: res.ingredient.categoryName,
            defaultUnit: res.ingredient.defaultUnit,
            ingredientStatus: res.ingredient.ingredientStatus,
            supplierCount: res.offers.length,
            minPrice: prices.length > 0 ? Math.min(...prices) : 0,
            maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
            currency: res.offers.length > 0 ? res.offers[0].currency : CurrencyEnum.VND,
         },
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
      };
   }
}
