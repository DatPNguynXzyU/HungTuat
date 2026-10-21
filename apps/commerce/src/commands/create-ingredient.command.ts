import { Command } from '@common';
import type { CreateIngredientDto, IngredientItemDto } from '@contracts/commerce';

export class CreateIngredientCommand extends Command<IngredientItemDto> {
   constructor(public readonly dto: CreateIngredientDto) {
      super();
   }
}
