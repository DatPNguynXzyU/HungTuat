import { CreateIngredientHandler } from '@commerce/commands/create-ingredient.handler';
import { CreateProductOfferHandler } from '@commerce/commands/create-product-offer.handler';
import { ValidateIngredientsHandler } from '@commerce/commands/validate-ingredients.handler';

export * from '@commerce/commands/create-ingredient.command';
export * from '@commerce/commands/create-ingredient.handler';
export * from '@commerce/commands/create-product-offer.command';
export * from '@commerce/commands/create-product-offer.handler';
export * from '@commerce/commands/validate-ingredients.command';
export * from '@commerce/commands/validate-ingredients.handler';

export const COMMERCE_COMMAND_HANDLERS = [
   CreateIngredientHandler,
   CreateProductOfferHandler,
   ValidateIngredientsHandler,
];
