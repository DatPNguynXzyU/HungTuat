import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { IngredientCatalogService, type ValidatedIngredientResultItem } from '@commerce/services';
import { ValidateIngredientsCommand } from '@commerce/commands/validate-ingredients.command';

@Injectable()
@CommandHandler(ValidateIngredientsCommand)
export class ValidateIngredientsHandler implements ICommandHandler<
   ValidateIngredientsCommand,
   {
      items: ValidatedIngredientResultItem[];
      allValid: boolean;
   }
> {
   constructor(private readonly ingredientCatalogService: IngredientCatalogService) {}

   async execute(command: ValidateIngredientsCommand): Promise<{
      items: ValidatedIngredientResultItem[];
      allValid: boolean;
   }> {
      return this.ingredientCatalogService.validateIngredients(command.ingredientIds);
   }
}
