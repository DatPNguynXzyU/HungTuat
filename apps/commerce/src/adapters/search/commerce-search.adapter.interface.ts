import type { IngredientDeletedPayload, IngredientEventPayload } from '@contracts/commerce';

export const COMMERCE_SEARCH_ADAPTER = Symbol('COMMERCE_SEARCH_ADAPTER');

export interface ICommerceSearchAdapter {
   emitIngredientCreated(payload: IngredientEventPayload): void;
   emitIngredientUpdated(payload: IngredientEventPayload): void;
   emitIngredientDeleted(payload: IngredientDeletedPayload): void;
}
