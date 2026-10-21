import { Command } from '@common';
import type { ValidatedIngredientResultItem } from '@commerce/services';

export class ValidateIngredientsCommand extends Command<{
   items: ValidatedIngredientResultItem[];
   allValid: boolean;
}> {
   constructor(public readonly ingredientIds: string[]) {
      super();
   }
}
