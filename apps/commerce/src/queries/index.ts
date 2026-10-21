import { GetIngredientDetailHandler } from '@commerce/queries/get-ingredient-detail.handler';
import { GetSuppliersByIngredientHandler } from '@commerce/queries/get-suppliers-by-ingredient.handler';
import { ListCategoriesHandler } from '@commerce/queries/list-categories.handler';

export * from '@commerce/queries/get-ingredient-detail.query';
export * from '@commerce/queries/get-ingredient-detail.handler';
export * from '@commerce/queries/get-suppliers-by-ingredient.query';
export * from '@commerce/queries/get-suppliers-by-ingredient.handler';
export * from '@commerce/queries/list-categories.query';
export * from '@commerce/queries/list-categories.handler';

export const COMMERCE_QUERY_HANDLERS = [
   GetIngredientDetailHandler,
   GetSuppliersByIngredientHandler,
   ListCategoriesHandler,
];
