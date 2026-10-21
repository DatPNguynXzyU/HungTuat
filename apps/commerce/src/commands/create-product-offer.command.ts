import { Command } from '@common';
import type { CreateProductOfferDto, SupplierProductOfferDto } from '@contracts/commerce';

export class CreateProductOfferCommand extends Command<SupplierProductOfferDto> {
   constructor(public readonly dto: CreateProductOfferDto) {
      super();
   }
}
