import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@common';
import { INGREDIENT_REPOSITORY, SUPPLIER_PRODUCT_REPOSITORY, SUPPLIER_REPOSITORY } from '@commerce/repositories';
import { COMMERCE_EVENTS, CurrencyEnum, INGREDIENT_STATUS, OFFER_STATUS, SUPPLIER_STATUS } from '@contracts/commerce';
import { SupplierOfferService } from '@commerce/services/supplier-offer.service';

describe('SupplierOfferService', () => {
   let service: SupplierOfferService;

   const mockSupplierRepo = {
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
   };

   const mockIngredientRepo = {
      findById: jest.fn(),
   };

   const mockSupplierProductRepo = {
      findByIngredientId: jest.fn(),
      findBySupplierAndSku: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateStock: jest.fn(),
   };

   const mockEventEmitter = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            SupplierOfferService,
            { provide: SUPPLIER_REPOSITORY, useValue: mockSupplierRepo },
            { provide: INGREDIENT_REPOSITORY, useValue: mockIngredientRepo },
            { provide: SUPPLIER_PRODUCT_REPOSITORY, useValue: mockSupplierProductRepo },
            { provide: EventEmitter2, useValue: mockEventEmitter },
         ],
      }).compile();

      service = module.get<SupplierOfferService>(SupplierOfferService);
   });

   it('should register a new supplier successfully', async () => {
      mockSupplierRepo.findByCode.mockResolvedValue(null);
      mockSupplierRepo.create.mockResolvedValue({
         supplierId: 'supp-1',
         supplierName: 'Mega Market',
         supplierCode: 'SUPP-MM',
         supplierSlug: 'mega-market',
         rating: 5,
         isVerified: true,
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
         version: 1,
         deletedAt: null,
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      const result = await service.registerSupplier({
         supplierName: 'Mega Market',
         supplierCode: 'SUPP-MM',
      });

      expect(result.supplierId).toBe('supp-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(COMMERCE_EVENTS.SUPPLIER_REGISTERED, expect.anything());
   });

   it('should throw ConflictException if supplier code already exists', async () => {
      mockSupplierRepo.findByCode.mockResolvedValue({ supplierId: 'existing' });

      await expect(
         service.registerSupplier({
            supplierName: 'Mega Market',
            supplierCode: 'SUPP-MM',
         }),
      ).rejects.toThrow(ConflictException);
   });

   it('should create product offer successfully', async () => {
      mockSupplierRepo.findById.mockResolvedValue({
         supplierId: 'supp-1',
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
      });
      mockIngredientRepo.findById.mockResolvedValue({
         ingredientId: 'ing-1',
         ingredientStatus: INGREDIENT_STATUS.ACTIVE,
      });
      mockSupplierProductRepo.findBySupplierAndSku.mockResolvedValue(null);
      mockSupplierProductRepo.create.mockResolvedValue({
         productId: 'prod-1',
         supplierId: 'supp-1',
         ingredientId: 'ing-1',
         productSku: 'SKU-001',
         productTitle: 'Thịt bò Wagyu',
         price: 500000,
         currency: CurrencyEnum.VND,
         stockQuantity: 10,
         offerStatus: OFFER_STATUS.AVAILABLE,
         version: 1,
         deletedAt: null,
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      const result = await service.createProductOffer({
         supplierId: 'supp-1',
         ingredientId: 'ing-1',
         productSku: 'SKU-001',
         productTitle: 'Thịt bò Wagyu',
         price: 500000,
      });

      expect(result.productId).toBe('prod-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(COMMERCE_EVENTS.PRODUCT_OFFER_CREATED, expect.anything());
   });
});
