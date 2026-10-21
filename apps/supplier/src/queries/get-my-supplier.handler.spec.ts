import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_ROLES } from '@common';
import { SUPPLIER_MEMBER_STATUS, SUPPLIER_STATUS } from '@contracts/supplier';
import { SUPPLIER_MEMBER_REPOSITORY } from '@supplier/repositories';
import { SupplierService } from '@supplier/services/supplier.service';
import { GetMySupplierHandler } from '@supplier/queries/get-my-supplier.handler';
import { GetMySupplierQuery } from '@supplier/queries/get-my-supplier.query';

describe('GetMySupplierHandler', () => {
   let handler: GetMySupplierHandler;
   const mockSupplierService = {
      getSupplierById: jest.fn(),
   };
   const mockSupplierMemberRepo = {
      findByAccountId: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            GetMySupplierHandler,
            { provide: SupplierService, useValue: mockSupplierService },
            { provide: SUPPLIER_MEMBER_REPOSITORY, useValue: mockSupplierMemberRepo },
         ],
      }).compile();

      handler = module.get<GetMySupplierHandler>(GetMySupplierHandler);
   });

   it('should return hasSupplier=false if accountId is empty or member not found', async () => {
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue(null);

      const result = await handler.execute(new GetMySupplierQuery(''));
      expect(result.hasSupplier).toBe(false);
      expect(result.supplier).toBeNull();
   });

   it('should return hasSupplier=false if member has no supplierId', async () => {
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue({
         memberId: 'mem-1',
         accountId: 'acc-1',
         supplierId: null,
         role: DEFAULT_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
      });

      const result = await handler.execute(new GetMySupplierQuery('acc-1'));
      expect(result.hasSupplier).toBe(false);
      expect(result.supplier).toBeNull();
      expect(result.role).toBe(DEFAULT_ROLES.SUPPLIER_ADMIN);
   });

   it('should return hasSupplier=true and supplier details if member is linked to supplier', async () => {
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue({
         memberId: 'mem-1',
         accountId: 'acc-1',
         supplierId: 'supp-1',
         role: DEFAULT_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
      });
      mockSupplierService.getSupplierById.mockResolvedValue({
         supplierId: 'supp-1',
         supplierName: 'Mega Market',
         supplierSlug: 'mega-market',
         supplierCode: 'SUPP-MM',
         rating: 5,
         isVerified: false,
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
      });

      const result = await handler.execute(new GetMySupplierQuery('acc-1'));
      expect(result.hasSupplier).toBe(true);
      expect(result.supplier?.supplierId).toBe('supp-1');
      expect(result.supplier?.supplierName).toBe('Mega Market');
      expect(result.role).toBe(DEFAULT_ROLES.SUPPLIER_ADMIN);
   });
});
