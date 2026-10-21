import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppLogger, SERVICES } from '@common';
import { COMMERCE_EVENTS, type IngredientDeletedPayload, type IngredientEventPayload } from '@contracts/commerce';
import type { ICommerceSearchAdapter } from '@commerce/adapters/search/commerce-search.adapter.interface';

@Injectable()
export class RabbitMqCommerceSearchAdapter implements ICommerceSearchAdapter {
   constructor(
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(RabbitMqCommerceSearchAdapter.name);
   }

   emitIngredientCreated(payload: IngredientEventPayload): void {
      try {
         this.searchClient.emit(COMMERCE_EVENTS.INGREDIENT_CREATED, payload);
         this.logger.debug(
            `Emitted ${COMMERCE_EVENTS.INGREDIENT_CREATED} to Search Service for ingredient ${payload.ingredientId}`,
         );
      } catch (error) {
         this.logger.error(
            `Failed to emit ${COMMERCE_EVENTS.INGREDIENT_CREATED} for ingredient ${payload.ingredientId}: ${(error as Error).message}`,
         );
      }
   }

   emitIngredientUpdated(payload: IngredientEventPayload): void {
      try {
         this.searchClient.emit(COMMERCE_EVENTS.INGREDIENT_UPDATED, payload);
         this.logger.debug(
            `Emitted ${COMMERCE_EVENTS.INGREDIENT_UPDATED} to Search Service for ingredient ${payload.ingredientId}`,
         );
      } catch (error) {
         this.logger.error(
            `Failed to emit ${COMMERCE_EVENTS.INGREDIENT_UPDATED} for ingredient ${payload.ingredientId}: ${(error as Error).message}`,
         );
      }
   }

   emitIngredientDeleted(payload: IngredientDeletedPayload): void {
      try {
         this.searchClient.emit(COMMERCE_EVENTS.INGREDIENT_DELETED, payload);
         this.logger.debug(
            `Emitted ${COMMERCE_EVENTS.INGREDIENT_DELETED} to Search Service for ingredient ${payload.ingredientId}`,
         );
      } catch (error) {
         this.logger.error(
            `Failed to emit ${COMMERCE_EVENTS.INGREDIENT_DELETED} for ingredient ${payload.ingredientId}: ${(error as Error).message}`,
         );
      }
   }
}
