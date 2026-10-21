import { Injectable } from '@nestjs/common';
import { PrismaService } from '@commerce/prisma/prisma.service';
import type { CategoryEntity, CreateCategoryData } from '@commerce/entities/category.entity';
import type { ICategoryRepository } from '@commerce/repositories/category.repository.interface';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
   constructor(private readonly prisma: PrismaService) {}

   async findAll(): Promise<CategoryEntity[]> {
      return this.prisma.category.findMany({
         where: { deletedAt: null },
         orderBy: { categoryName: 'asc' },
      });
   }

   async findById(categoryId: string): Promise<CategoryEntity | null> {
      return this.prisma.category.findFirst({
         where: { categoryId, deletedAt: null },
      });
   }

   async findBySlug(slug: string): Promise<CategoryEntity | null> {
      return this.prisma.category.findFirst({
         where: { categorySlug: slug, deletedAt: null },
      });
   }

   async create(data: CreateCategoryData): Promise<CategoryEntity> {
      return this.prisma.category.create({
         data: {
            categoryName: data.categoryName,
            categorySlug: data.categorySlug,
            iconUrl: data.iconUrl,
         },
      });
   }
}
