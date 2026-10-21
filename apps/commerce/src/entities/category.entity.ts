export interface CategoryEntity {
   categoryId: string;
   categoryName: string;
   categorySlug: string;
   iconUrl?: string | null;
   version?: number;
   deletedAt?: Date | null;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateCategoryData {
   categoryName: string;
   categorySlug: string;
   iconUrl?: string | null;
}
