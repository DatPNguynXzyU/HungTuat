import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { CurrencyEnum, type IngredientItemDto } from '@contracts/commerce';
import { COMMERCE_SEARCH_ADAPTER, type ICommerceSearchAdapter } from '@commerce/adapters/search';
import { IngredientCatalogService } from '@commerce/services';
import { CreateIngredientCommand } from '@commerce/commands/create-ingredient.command';

@Injectable()
@CommandHandler(CreateIngredientCommand)
export class CreateIngredientHandler implements ICommandHandler<CreateIngredientCommand, IngredientItemDto> {
   constructor(
      private readonly ingredientCatalogService: IngredientCatalogService,
      @Inject(COMMERCE_SEARCH_ADAPTER)
      private readonly searchAdapter: ICommerceSearchAdapter,
   ) {}

   async execute(command: CreateIngredientCommand): Promise<IngredientItemDto> {
      const created = await this.ingredientCatalogService.createIngredient(command.dto);

      // Asynchronously publish event to Search Service for Elasticsearch indexing
      this.searchAdapter.emitIngredientCreated({
         ingredientId: created.ingredientId,
         ingredientName: created.ingredientName,
         normalizedName: created.normalizedName,
         ingredientSlug: created.ingredientSlug,
         ingredientDescription: created.ingredientDescription,
         ingredientImageUrl: created.ingredientImageUrl,
         categoryId: created.categoryId,
         categoryName: created.categoryName,
         defaultUnit: created.defaultUnit,
         ingredientStatus: created.ingredientStatus,
         supplierCount: 0,
         minPrice: 0,
         maxPrice: 0,
         currency: CurrencyEnum.VND,
         createdAt: created.createdAt,
         updatedAt: created.updatedAt,
      });

      return {
         ingredientId: created.ingredientId,
         ingredientName: created.ingredientName,
         normalizedName: created.normalizedName,
         ingredientSlug: created.ingredientSlug,
         ingredientDescription: created.ingredientDescription,
         ingredientImageUrl: created.ingredientImageUrl,
         categoryId: created.categoryId,
         categoryName: created.category?.categoryName ?? '',
         defaultUnit: created.defaultUnit,
         ingredientStatus: created.ingredientStatus,
         supplierCount: 0,
         minPrice: 0,
         maxPrice: 0,
         currency: CurrencyEnum.VND,
      };
   }
}
