import type {
   CreateIngredientData,
   IngredientEntity,
   UpdateIngredientData,
} from '@commerce/entities/ingredient.entity';

export const INGREDIENT_REPOSITORY = Symbol('INGREDIENT_REPOSITORY');

export interface IIngredientRepository {
   findById(ingredientId: string): Promise<IngredientEntity | null>;
   findBySlug(slug: string): Promise<IngredientEntity | null>;
   findByName(name: string): Promise<IngredientEntity | null>;
   findByIds(ingredientIds: string[]): Promise<IngredientEntity[]>;
   create(data: CreateIngredientData): Promise<IngredientEntity>;
   update(ingredientId: string, data: UpdateIngredientData): Promise<IngredientEntity | null>;
   softDelete(ingredientId: string): Promise<boolean>;
}
