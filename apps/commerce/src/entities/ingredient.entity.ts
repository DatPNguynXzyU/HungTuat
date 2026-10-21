import type { CategoryEntity } from '@commerce/entities/category.entity';
import type { SupplierProductEntity } from '@commerce/entities/supplier-product.entity';

export interface IngredientEntity {
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
   version?: number;
   deletedAt?: Date | null;
   createdAt: Date;
   updatedAt: Date;
   category?: CategoryEntity;
   offers?: SupplierProductEntity[];
}

export interface CreateIngredientData {
   ingredientName: string;
   normalizedName: string;
   ingredientSlug: string;
   ingredientDescription: string;
   ingredientImageUrl: string;
   categoryId: string;
   defaultUnit: string;
   ingredientStatus?: string;
}

export interface UpdateIngredientData {
   ingredientName?: string;
   normalizedName?: string;
   ingredientSlug?: string;
   ingredientDescription?: string;
   ingredientImageUrl?: string;
   categoryId?: string;
   defaultUnit?: string;
   ingredientStatus?: string;
}
