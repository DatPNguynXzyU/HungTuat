import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, COMMON_ERROR_CODES, ConflictException, NotFoundException } from '@common';
import { COMMERCE_ERROR_CODES, COMMERCE_EVENTS, type CreateIngredientDto } from '@contracts/commerce';
import {
   CATEGORY_REPOSITORY,
   INGREDIENT_REPOSITORY,
   SUPPLIER_PRODUCT_REPOSITORY,
   type ICategoryRepository,
   type IIngredientRepository,
   type ISupplierProductRepository,
} from '@commerce/repositories';
import { Slug } from '@commerce/domain/value-objects';
import { IngredientCreatedEvent } from '@commerce/domain/events';
import type { CategoryEntity } from '@commerce/entities/category.entity';
import type { IngredientEntity } from '@commerce/entities/ingredient.entity';
import type { SupplierProductEntity } from '@commerce/entities/supplier-product.entity';

export interface IngredientDetailsResult {
   ingredient: IngredientEntity;
   offers: SupplierProductEntity[];
}

export interface ValidatedIngredientResultItem {
   ingredientId: string;
   ingredientName: string;
   defaultUnit: string;
   exists: boolean;
   hasSuppliers: boolean;
}

@Injectable()
export class IngredientCatalogService {
   constructor(
      @Inject(INGREDIENT_REPOSITORY)
      private readonly ingredientRepository: IIngredientRepository,
      @Inject(CATEGORY_REPOSITORY)
      private readonly categoryRepository: ICategoryRepository,
      @Inject(SUPPLIER_PRODUCT_REPOSITORY)
      private readonly supplierProductRepository: ISupplierProductRepository,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   async getIngredientById(ingredientId: string): Promise<IngredientDetailsResult> {
      const ingredient = await this.ingredientRepository.findById(ingredientId);
      if (!ingredient) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND, {
            params: { ingredientId },
         });
      }

      const offers = await this.supplierProductRepository.findByIngredientId(ingredientId, false);

      return {
         ingredient,
         offers,
      };
   }

   async validateIngredients(ingredientIds: string[]): Promise<{
      items: ValidatedIngredientResultItem[];
      allValid: boolean;
   }> {
      if (!ingredientIds || ingredientIds.length === 0) {
         return { items: [], allValid: true };
      }

      const existingRecords = await this.ingredientRepository.findByIds(ingredientIds);
      const existingMap = new Map(existingRecords.map((r) => [r.ingredientId, r]));

      const items: ValidatedIngredientResultItem[] = [];
      let allValid = true;

      for (const id of ingredientIds) {
         const found = existingMap.get(id);
         if (!found) {
            throw new NotFoundException(COMMERCE_ERROR_CODES.INGREDIENT_NOT_FOUND, {
               params: { ingredientId: id },
            });
         }

         const offers = (await this.supplierProductRepository.findByIngredientId(id, true)) || [];
         const hasSuppliers = offers.length > 0;
         if (!hasSuppliers) {
            allValid = false;
         }

         items.push({
            ingredientId: found.ingredientId,
            ingredientName: found.ingredientName,
            defaultUnit: found.defaultUnit,
            exists: true,
            hasSuppliers,
         });
      }

      return { items, allValid };
   }

   async createIngredient(dto: CreateIngredientDto): Promise<IngredientEntity> {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
         throw new NotFoundException(COMMERCE_ERROR_CODES.CATEGORY_NOT_FOUND, {
            params: { categoryId: dto.categoryId },
         });
      }

      const generatedSlug = new Slug(dto.ingredientName).value;
      const existing = await this.ingredientRepository.findBySlug(generatedSlug);
      if (existing) {
         throw new ConflictException(COMMERCE_ERROR_CODES.INGREDIENT_ALREADY_EXISTS, {
            params: { name: dto.ingredientName, slug: generatedSlug },
         });
      }

      const normalizedName = dto.ingredientName
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[đĐ]/g, 'd')
         .trim();

      if (!dto.ingredientDescription || dto.ingredientDescription.trim().length === 0) {
         throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
            params: { field: 'ingredientDescription' },
         });
      }
      if (!dto.ingredientImageUrl || dto.ingredientImageUrl.trim().length === 0) {
         throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
            params: { field: 'ingredientImageUrl' },
         });
      }

      const created = await this.ingredientRepository.create({
         ingredientName: dto.ingredientName.trim(),
         normalizedName,
         ingredientSlug: generatedSlug,
         ingredientDescription: dto.ingredientDescription.trim(),
         ingredientImageUrl: dto.ingredientImageUrl.trim(),
         categoryId: dto.categoryId,
         defaultUnit: dto.defaultUnit.trim(),
      });

      this.eventEmitter.emit(
         COMMERCE_EVENTS.INGREDIENT_CREATED,
         new IngredientCreatedEvent(
            created.ingredientId,
            created.ingredientName,
            created.ingredientSlug,
            created.categoryId,
         ),
      );

      return created;
   }

   async listCategories(): Promise<CategoryEntity[]> {
      return this.categoryRepository.findAll();
   }
}
