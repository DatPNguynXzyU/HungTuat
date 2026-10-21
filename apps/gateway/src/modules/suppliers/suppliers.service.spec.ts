import { Test, TestingModule } from '@nestjs/testing';
import type { ClientGrpc } from '@nestjs/microservices';
import { of } from 'rxjs';
import { DEFAULT_ROLES } from '@common';
import {
   SUPPLIER_MEMBER_STATUS,
   SUPPLIER_STATUS,
   SUPPLIER_V1_GRPC_CLIENT,
   type ISupplierV1GrpcService,
   type SupplierItemDto,
} from '@contracts/supplier';
import { SuppliersService } from '@/modules/suppliers/suppliers.service';

describe('SuppliersService', () => {
   let service: SuppliersService;
   let mockGrpcService: jest.Mocked<ISupplierV1GrpcService>;

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
      mockGrpcService = {
         getSupplierById: jest.fn(),
         getSuppliersByIds: jest.fn(),
         listSuppliers: jest.fn(),
         registerSupplier: jest.fn(),
         getMySupplier: jest.fn(),
         updateSupplier: jest.fn(),
         verifySupplier: jest.fn(),
      };

      const mockClientGrpc: jest.Mocked<ClientGrpc> = {
         getService: jest.fn().mockReturnValue(mockGrpcService),
         getClientByServiceName: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [SuppliersService, { provide: SUPPLIER_V1_GRPC_CLIENT, useValue: mockClientGrpc }],
      }).compile();

      service = module.get<SuppliersService>(SuppliersService);
      service.onModuleInit();
   });

   it('should call supplier gRPC registerSupplier and map response', async () => {
      mockGrpcService.registerSupplier.mockReturnValue(
         of({
            supplier: {
               supplierId: mockSupplier.supplierId,
               supplierName: mockSupplier.supplierName,
               supplierSlug: mockSupplier.supplierSlug,
               supplierCode: mockSupplier.supplierCode,
               contactEmail: mockSupplier.contactEmail || '',
               contactPhone: mockSupplier.contactPhone || '',
               address: mockSupplier.address || '',
               city: mockSupplier.city || '',
               rating: mockSupplier.rating,
               isVerified: mockSupplier.isVerified,
               supplierStatus: mockSupplier.supplierStatus,
               supplierLogoUrl: mockSupplier.supplierLogoUrl || '',
            },
         }),
      );

      const result = await service.registerSupplier(
         {
            supplierName: 'Mega Market',
            supplierCode: 'SUPP-MM',
         },
         {
            authHeader: 'Bearer test-token',
            correlationId: 'req-123',
         },
      );

      expect(mockGrpcService.registerSupplier).toHaveBeenCalled();
      expect(result.supplierId).toBe(mockSupplier.supplierId);
      expect(result.supplierName).toBe('Mega Market');
   });

   it('should call supplier gRPC getMySupplier and map response', async () => {
      mockGrpcService.getMySupplier.mockReturnValue(
         of({
            hasSupplier: true,
            supplier: {
               supplierId: mockSupplier.supplierId,
               supplierName: mockSupplier.supplierName,
               supplierSlug: mockSupplier.supplierSlug,
               supplierCode: mockSupplier.supplierCode,
               contactEmail: mockSupplier.contactEmail || '',
               contactPhone: mockSupplier.contactPhone || '',
               address: mockSupplier.address || '',
               city: mockSupplier.city || '',
               rating: mockSupplier.rating,
               isVerified: mockSupplier.isVerified,
               supplierStatus: mockSupplier.supplierStatus,
               supplierLogoUrl: mockSupplier.supplierLogoUrl || '',
            },
            role: DEFAULT_ROLES.SUPPLIER_ADMIN,
            memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         }),
      );

      const result = await service.getMySupplier({
         authHeader: 'Bearer test-token',
         correlationId: 'req-123',
         accountId: 'acc-123',
      });

      expect(mockGrpcService.getMySupplier).toHaveBeenCalled();
      expect(result.hasSupplier).toBe(true);
      expect(result.supplier?.supplierId).toBe(mockSupplier.supplierId);
      expect(result.role).toBe(DEFAULT_ROLES.SUPPLIER_ADMIN);
   });
});
