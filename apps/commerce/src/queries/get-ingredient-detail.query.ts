import { Command } from '@common';
import type { IngredientItemDto, SupplierProductOfferDto } from '@contracts/commerce';

export interface IngredientDetailsResponse {
   ingredient: IngredientItemDto;
   offers: SupplierProductOfferDto[];
}

export class GetIngredientDetailQuery extends Command<IngredientDetailsResponse> {
   constructor(public readonly ingredientId: string) {
      super();
   }
}
