import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { DEFAULT_ROLES } from '@common';
import { SUPPLIER_MEMBER_STATUS, SUPPLIER_STATUS, type SupplierItemDto } from '@contracts/supplier';
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

   it('should extract user context and delegate registerSupplier to SuppliersService', async () => {
      mockSuppliersService.registerSupplier.mockResolvedValue(mockSupplier);

      const dto = {
         supplierName: 'Mega Market',
         supplierCode: 'SUPP-MM',
      };

      const mockRequest = {
         headers: {
            'x-correlation-id': 'corr-456',
         },
      } as unknown as Request;

      const mockUser = {
         sub: 'acc-123',
         email: 'test@example.com',
         roles: [DEFAULT_ROLES.SUPPLIER_ADMIN],
      } as never;

      const result = await controller.registerSupplier(dto, mockRequest, mockUser);

      expect(mockSuppliersService.registerSupplier).toHaveBeenCalledWith(dto, {
         correlationId: 'corr-456',
         accountId: 'acc-123',
         roles: [DEFAULT_ROLES.SUPPLIER_ADMIN],
         email: 'test@example.com',
      });
      expect(result).toEqual(mockSupplier);
   });

   it('should extract user context and delegate getMySupplier to SuppliersService', async () => {
      const mockMySupplier = {
         hasSupplier: true,
         supplier: mockSupplier,
         role: DEFAULT_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
      };
      mockSuppliersService.getMySupplier = jest.fn().mockResolvedValue(mockMySupplier);

      const mockRequest = {
         headers: {
            'x-correlation-id': 'corr-456',
         },
      } as unknown as Request;

      const mockUser = {
         sub: 'acc-123',
         email: 'test@example.com',
         roles: [DEFAULT_ROLES.SUPPLIER_ADMIN],
      } as never;

      const result = await controller.getMySupplier(mockRequest, mockUser);

      expect(mockSuppliersService.getMySupplier).toHaveBeenCalledWith({
         correlationId: 'corr-456',
         accountId: 'acc-123',
         roles: [DEFAULT_ROLES.SUPPLIER_ADMIN],
         email: 'test@example.com',
      });
      expect(result).toEqual(mockMySupplier);
   });
});
