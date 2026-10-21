import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@common';
import { CATEGORY_REPOSITORY, INGREDIENT_REPOSITORY, SUPPLIER_PRODUCT_REPOSITORY } from '@commerce/repositories';
import { COMMERCE_EVENTS, CurrencyEnum } from '@contracts/commerce';
import { IngredientCatalogService } from '@commerce/services/ingredient-catalog.service';
import type { IngredientEntity } from '@commerce/entities/ingredient.entity';
import type { SupplierProductEntity } from '@commerce/entities/supplier-product.entity';

describe('IngredientCatalogService', () => {
   let service: IngredientCatalogService;

   const mockIngredientRepo = {
      search: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByName: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
   };

   const mockCategoryRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
   };

   const mockSupplierProductRepo = {
      findByIngredientId: jest.fn(),
   };

   const mockEventEmitter = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            IngredientCatalogService,
            { provide: INGREDIENT_REPOSITORY, useValue: mockIngredientRepo },
            { provide: CATEGORY_REPOSITORY, useValue: mockCategoryRepo },
            { provide: SUPPLIER_PRODUCT_REPOSITORY, useValue: mockSupplierProductRepo },
            { provide: EventEmitter2, useValue: mockEventEmitter },
         ],
      }).compile();

      service = module.get<IngredientCatalogService>(IngredientCatalogService);
   });

   it('should validate ingredients correctly when all ingredients exist', async () => {
      mockIngredientRepo.findByIds.mockResolvedValue([
         {
            ingredientId: 'ing-1',
            ingredientName: 'Thịt bò Wagyu',
            defaultUnit: 'g',
         } as IngredientEntity,
         {
            ingredientId: 'ing-2',
            ingredientName: 'Nước tương Kikkoman',
            defaultUnit: 'ml',
         } as IngredientEntity,
      ]);

      mockSupplierProductRepo.findByIngredientId
         .mockResolvedValueOnce([{ price: 450000, currency: CurrencyEnum.VND } as SupplierProductEntity])
         .mockResolvedValueOnce([]);

      const result = await service.validateIngredients(['ing-1', 'ing-2']);

      expect(result.allValid).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].exists).toBe(true);
      expect(result.items[0].hasSuppliers).toBe(true);
      expect(result.items[1].exists).toBe(true);
      expect(result.items[1].hasSuppliers).toBe(false);
   });

   it('should throw NotFoundException if any ingredient does not exist in validateIngredients', async () => {
      mockIngredientRepo.findByIds.mockResolvedValue([
         {
            ingredientId: 'ing-1',
            ingredientName: 'Thịt bò Wagyu',
            defaultUnit: 'g',
         } as IngredientEntity,
      ]);

      mockSupplierProductRepo.findByIngredientId.mockResolvedValue([]);

      await expect(service.validateIngredients(['ing-1', 'invalid-ing'])).rejects.toThrow(NotFoundException);
   });

   it('should throw NotFoundException if ingredient not found by ID', async () => {
      mockIngredientRepo.findById.mockResolvedValue(null);

      await expect(service.getIngredientById('invalid-id')).rejects.toThrow(NotFoundException);
   });

   it('should create an ingredient and emit COMMERCE_EVENTS.INGREDIENT_CREATED', async () => {
      mockCategoryRepo.findById.mockResolvedValue({ categoryId: 'cat-1' });
      mockIngredientRepo.findBySlug.mockResolvedValue(null);
      mockIngredientRepo.create.mockResolvedValue({
         ingredientId: 'ing-1',
         ingredientName: 'Thịt bò Wagyu',
         ingredientSlug: 'thit-bo-wagyu',
         categoryId: 'cat-1',
         categoryName: 'Thịt & Hải sản',
      });

      const result = await service.createIngredient({
         ingredientName: 'Thịt bò Wagyu',
         ingredientDescription: 'Thịt bò tươi ngon cao cấp',
         ingredientImageUrl: 'https://cdn.example.com/wagyu.jpg',
         categoryId: 'cat-1',
         defaultUnit: 'g',
      });

      expect(result.ingredientId).toBe('ing-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(COMMERCE_EVENTS.INGREDIENT_CREATED, expect.anything());
   });
});
