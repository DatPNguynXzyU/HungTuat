import type { CategoryEntity, CreateCategoryData } from '@commerce/entities/category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface ICategoryRepository {
   findAll(): Promise<CategoryEntity[]>;
   findById(categoryId: string): Promise<CategoryEntity | null>;
   findBySlug(slug: string): Promise<CategoryEntity | null>;
   create(data: CreateCategoryData): Promise<CategoryEntity>;
}
