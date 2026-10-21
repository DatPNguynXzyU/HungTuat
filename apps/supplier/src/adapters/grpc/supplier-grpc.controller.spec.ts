import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, DEFAULT_ROLES, GrpcJwtAuthGuard } from '@common';
import { SUPPLIER_MEMBER_STATUS, SUPPLIER_STATUS, type SupplierItemDto } from '@contracts/supplier';
import { SupplierGrpcController } from '@supplier/adapters/grpc/supplier-grpc.controller';
import { RegisterSupplierCommand } from '@supplier/commands';
import { firstValueFrom } from 'rxjs';

describe('SupplierGrpcController', () => {
   let controller: SupplierGrpcController;
   let mockCommandBus: jest.Mocked<CommandBus>;

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
      mockCommandBus = {
         execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      const module: TestingModule = await Test.createTestingModule({
         controllers: [SupplierGrpcController],
         providers: [{ provide: CommandBus, useValue: mockCommandBus }],
      })
         .overrideGuard(GrpcJwtAuthGuard)
         .useValue({ canActivate: () => true })
         .compile();

      controller = module.get<SupplierGrpcController>(SupplierGrpcController);
   });

   it('should execute RegisterSupplierCommand when registering supplier', async () => {
      mockCommandBus.execute.mockResolvedValue(mockSupplier);

      const request = {
         supplierName: 'Mega Market',
         supplierCode: 'SUPP-MM',
         contactEmail: 'contact@megamarket.vn',
         contactPhone: '0901234567',
         address: 'An Phu',
         city: 'Ho Chi Minh',
         supplierLogoUrl: 'https://example.com/logo.png',
      };

      const response$ = controller.registerSupplier(request);
      const result = await firstValueFrom(response$);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(expect.any(RegisterSupplierCommand));
      expect(result.supplier.supplierId).toBe(mockSupplier.supplierId);
      expect(result.supplier.supplierName).toBe(mockSupplier.supplierName);
   });

   it('should execute GetMySupplierQuery when calling getMySupplier', async () => {
      mockCommandBus.execute.mockResolvedValue({
         hasSupplier: true,
         supplier: mockSupplier,
         role: DEFAULT_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
      });

      const request = { accountId: 'acc-123' };
      const response$ = controller.getMySupplier(request);
      const result = await firstValueFrom(response$);

      expect(result.hasSupplier).toBe(true);
      expect(result.supplier?.supplierId).toBe(mockSupplier.supplierId);
      expect(result.role).toBe(DEFAULT_ROLES.SUPPLIER_ADMIN);
   });
});
