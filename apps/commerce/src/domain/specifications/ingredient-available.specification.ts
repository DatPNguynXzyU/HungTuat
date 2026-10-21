import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { COMMERCE_ERROR_CODES, INGREDIENT_STATUS } from '@contracts/commerce';
import type { IngredientEntity } from '@commerce/entities/ingredient.entity';

@Injectable()
export class IngredientAvailableSpecification extends Specification<IngredientEntity> {
   protected readonly errorCode = COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND;

   isSatisfiedBy(candidate: IngredientEntity): boolean {
      if (!candidate) {
         return false;
      }
      if (candidate.deletedAt) {
         return false;
      }
      return candidate.ingredientStatus === INGREDIENT_STATUS.ACTIVE;
   }
}
