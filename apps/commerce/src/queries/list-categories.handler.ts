import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { CategoryItemDto } from '@contracts/commerce';
import { IngredientCatalogService } from '@commerce/services';
import { ListCategoriesQuery } from '@commerce/queries/list-categories.query';

@Injectable()
@CommandHandler(ListCategoriesQuery)
export class ListCategoriesHandler implements ICommandHandler<ListCategoriesQuery, CategoryItemDto[]> {
   constructor(private readonly ingredientCatalogService: IngredientCatalogService) {}

   async execute(): Promise<CategoryItemDto[]> {
      const categories = await this.ingredientCatalogService.listCategories();
      return categories.map((c) => ({
         categoryId: c.categoryId,
         categoryName: c.categoryName,
         categorySlug: c.categorySlug,
         iconUrl: c.iconUrl || undefined,
      }));
   }
}
