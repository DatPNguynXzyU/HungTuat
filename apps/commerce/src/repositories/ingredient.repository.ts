import { Injectable } from '@nestjs/common';
import { INGREDIENT_STATUS } from '@contracts/commerce';
import { PrismaService } from '@commerce/prisma/prisma.service';
import type {
   CreateIngredientData,
   IngredientEntity,
   UpdateIngredientData,
} from '@commerce/entities/ingredient.entity';
import type { IIngredientRepository } from '@commerce/repositories/ingredient.repository.interface';

@Injectable()
export class IngredientRepository implements IIngredientRepository {
   constructor(private readonly prisma: PrismaService) {}

   private mapPrismaToEntity(record: {
      ingredientId: string;
      ingredientName: string;
      normalizedName: string;
      ingredientSlug: string;
      ingredientDescription: string;
      ingredientImageUrl: string;
      categoryId: string;
      defaultUnit: string;
      ingredientStatus: string;
      version: number;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      category?: {
         categoryId: string;
         categoryName: string;
         categorySlug: string;
         iconUrl: string | null;
         version: number;
         deletedAt: Date | null;
         createdAt: Date;
         updatedAt: Date;
      } | null;
   }): IngredientEntity {
      return {
         ingredientId: record.ingredientId,
         ingredientName: record.ingredientName,
         normalizedName: record.normalizedName,
         ingredientSlug: record.ingredientSlug,
         ingredientDescription: record.ingredientDescription,
         ingredientImageUrl: record.ingredientImageUrl,
         categoryId: record.categoryId,
         categoryName: record.category ? record.category.categoryName : '',
         defaultUnit: record.defaultUnit,
         ingredientStatus: record.ingredientStatus,
         version: record.version,
         deletedAt: record.deletedAt,
         createdAt: record.createdAt,
         updatedAt: record.updatedAt,
         category: record.category
            ? {
                 categoryId: record.category.categoryId,
                 categoryName: record.category.categoryName,
                 categorySlug: record.category.categorySlug,
                 iconUrl: record.category.iconUrl,
                 version: record.category.version,
                 deletedAt: record.category.deletedAt,
                 createdAt: record.category.createdAt,
                 updatedAt: record.category.updatedAt,
              }
            : undefined,
      };
   }

   async findById(ingredientId: string): Promise<IngredientEntity | null> {
      const record = await this.prisma.ingredient.findFirst({
         where: { ingredientId, deletedAt: null },
         include: { category: true },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findBySlug(slug: string): Promise<IngredientEntity | null> {
      const record = await this.prisma.ingredient.findFirst({
         where: { ingredientSlug: slug, deletedAt: null },
         include: { category: true },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findByName(name: string): Promise<IngredientEntity | null> {
      const record = await this.prisma.ingredient.findFirst({
         where: {
            ingredientName: { equals: name, mode: 'insensitive' },
            deletedAt: null,
         },
         include: { category: true },
      });
      return record ? this.mapPrismaToEntity(record) : null;
   }

   async findByIds(ingredientIds: string[]): Promise<IngredientEntity[]> {
      const records = await this.prisma.ingredient.findMany({
         where: {
            ingredientId: { in: ingredientIds },
            deletedAt: null,
         },
         include: { category: true },
      });
      return records.map((r) => this.mapPrismaToEntity(r));
   }

   async create(data: CreateIngredientData): Promise<IngredientEntity> {
      const record = await this.prisma.ingredient.create({
         data: {
            ingredientName: data.ingredientName,
            normalizedName: data.normalizedName,
            ingredientSlug: data.ingredientSlug,
            ingredientDescription: data.ingredientDescription,
            ingredientImageUrl: data.ingredientImageUrl,
            categoryId: data.categoryId,
            defaultUnit: data.defaultUnit,
            ingredientStatus: INGREDIENT_STATUS.ACTIVE,
         },
         include: { category: true },
      });
      return this.mapPrismaToEntity(record);
   }

   async update(ingredientId: string, data: UpdateIngredientData): Promise<IngredientEntity | null> {
      const record = await this.prisma.ingredient.update({
         where: { ingredientId },
         data: {
            ...(data.ingredientName ? { ingredientName: data.ingredientName } : {}),
            ...(data.normalizedName ? { normalizedName: data.normalizedName } : {}),
            ...(data.ingredientSlug ? { ingredientSlug: data.ingredientSlug } : {}),
            ...(data.ingredientDescription !== undefined ? { ingredientDescription: data.ingredientDescription } : {}),
            ...(data.ingredientImageUrl !== undefined ? { ingredientImageUrl: data.ingredientImageUrl } : {}),
            ...(data.categoryId ? { category: { connect: { categoryId: data.categoryId } } } : {}),
            ...(data.defaultUnit ? { defaultUnit: data.defaultUnit } : {}),
            version: { increment: 1 },
         },
         include: { category: true },
      });
      return this.mapPrismaToEntity(record);
   }

   async softDelete(ingredientId: string): Promise<boolean> {
      const res = await this.prisma.ingredient.update({
         where: { ingredientId },
         data: {
            deletedAt: new Date(),
            version: { increment: 1 },
         },
      });
      return !!res;
   }
}
