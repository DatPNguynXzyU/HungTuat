import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { SUPPLIER_STATUS, type SupplierItemDto } from '@contracts/supplier';
import { SuppliersController } from '@/modules/suppliers/suppliers.controller';
import { SuppliersService } from '@/modules/suppliers/suppliers.service';

describe('SuppliersController', () => {
   let controller: SuppliersController;
   let mockSuppliersService: jest.Mocked<SuppliersService>;

   const mockSupplier: SupplierItemDto = {
      supplierId: '0192e21b-0003-7000-8000-000000000001',
      supplierName: 'Mega Market',
      supplierSlug: 'mega-market',
      supplierCode: 'SUPP-MM',
      contactEmail: 'contact@megamarket.vn',
      contactPhone: '0901234567',
      address: 'An Phu',
      city: 'Ho Chi Minh',
      rating: 5,
      isVerified: false,
      supplierStatus: SUPPLIER_STATUS.ACTIVE,
      supplierLogoUrl: 'https://example.com/logo.png',
   };

   beforeEach(async () => {
      mockSuppliersService = {
         registerSupplier: jest.fn(),
      } as unknown as jest.Mocked<SuppliersService>;

      const module: TestingModule = await Test.createTestingModule({
         controllers: [SuppliersController],
         providers: [{ provide: SuppliersService, useValue: mockSuppliersService }],
      }).compile();

      controller = module.get<SuppliersController>(SuppliersController);
   });

   it('should extract auth header and delegate registerSupplier to SuppliersService', async () => {
      mockSuppliersService.registerSupplier.mockResolvedValue(mockSupplier);

      const dto = {
         supplierName: 'Mega Market',
         supplierCode: 'SUPP-MM',
      };

      const mockRequest = {
         headers: {
            authorization: 'Bearer jwt-token-xyz',
            'x-correlation-id': 'corr-456',
         },
         cookies: {},
      } as unknown as Request;

      const result = await controller.registerSupplier(dto, mockRequest);

      expect(mockSuppliersService.registerSupplier).toHaveBeenCalledWith(dto, {
         authHeader: 'Bearer jwt-token-xyz',
         correlationId: 'corr-456',
      });
      expect(result).toEqual(mockSupplier);
   });
});
