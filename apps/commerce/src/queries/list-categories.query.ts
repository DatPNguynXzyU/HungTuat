import { Command } from '@common';
import type { CategoryItemDto } from '@contracts/commerce';

export class ListCategoriesQuery extends Command<CategoryItemDto[]> {
   constructor() {
      super();
   }
}
