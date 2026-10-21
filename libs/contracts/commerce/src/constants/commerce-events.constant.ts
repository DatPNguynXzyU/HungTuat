export const COMMERCE_EVENTS = {
   INGREDIENT_CREATED: 'ingredient.created',
   INGREDIENT_UPDATED: 'ingredient.updated',
   INGREDIENT_DELETED: 'ingredient.deleted',
   SUPPLIER_REGISTERED: 'supplier.registered',
   PRODUCT_OFFER_CREATED: 'product.offer.created',
   PRODUCT_STOCK_UPDATED: 'product.stock.updated',
} as const;

export type CommerceEvent = (typeof COMMERCE_EVENTS)[keyof typeof COMMERCE_EVENTS];

export interface IngredientEventPayload {
   ingredientId: string;
   ingredientName: string;
   normalizedName: string;
   ingredientSlug: string;
   ingredientDescription: string;
   ingredientImageUrl: string;
   categoryId: string;
   categoryName: string;
   defaultUnit: string;
   ingredientStatus: string;
   supplierCount?: number;
   minPrice?: number;
   maxPrice?: number;
   currency?: string;
   createdAt?: Date | string;
   updatedAt?: Date | string;
}

export interface IngredientDeletedPayload {
   ingredientId: string;
}
