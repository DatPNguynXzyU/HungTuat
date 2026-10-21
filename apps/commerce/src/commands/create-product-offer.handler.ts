import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { OFFER_STATUS, type SupplierProductOfferDto } from '@contracts/commerce';
import { SupplierOfferService } from '@commerce/services';
import { CreateProductOfferCommand } from '@commerce/commands/create-product-offer.command';

@Injectable()
@CommandHandler(CreateProductOfferCommand)
export class CreateProductOfferHandler implements ICommandHandler<CreateProductOfferCommand, SupplierProductOfferDto> {
   constructor(private readonly supplierOfferService: SupplierOfferService) {}

   async execute(command: CreateProductOfferCommand): Promise<SupplierProductOfferDto> {
      const created = await this.supplierOfferService.createProductOffer(command.dto);
      return {
         productId: created.productId,
         supplierId: created.supplierId,
         ingredientId: created.ingredientId,
         productSku: created.productSku,
         productTitle: created.productTitle,
         price: created.price,
         currency: created.currency,
         originalPrice: created.originalPrice || undefined,
         packageSize: created.packageSize || undefined,
         stockQuantity: created.stockQuantity,
         inStock: created.offerStatus === OFFER_STATUS.AVAILABLE && created.stockQuantity > 0,
         productUrl: created.productUrl || undefined,
         productImageUrl: created.productImageUrl || undefined,
         offerStatus: created.offerStatus,
         supplier: created.supplier
            ? {
                 supplierId: created.supplier.supplierId,
                 supplierName: created.supplier.supplierName,
                 supplierSlug: created.supplier.supplierSlug,
                 supplierCode: created.supplier.supplierCode,
                 contactEmail: created.supplier.contactEmail || undefined,
                 contactPhone: created.supplier.contactPhone || undefined,
                 address: created.supplier.address || undefined,
                 city: created.supplier.city || undefined,
                 rating: created.supplier.rating,
                 isVerified: created.supplier.isVerified,
                 supplierStatus: created.supplier.supplierStatus,
                 supplierLogoUrl: created.supplier.supplierLogoUrl || undefined,
              }
            : undefined,
      };
   }
}
