import { Command } from '@common';
import type { IngredientSuppliersResponseDto } from '@contracts/commerce';

export class GetSuppliersByIngredientQuery extends Command<IngredientSuppliersResponseDto> {
   constructor(
      public readonly ingredientId: string,
      public readonly inStockOnly: boolean = false,
   ) {
      super();
   }
}
