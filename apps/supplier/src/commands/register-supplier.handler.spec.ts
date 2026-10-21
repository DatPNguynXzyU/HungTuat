import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@common';
import { SUPPLIER_STATUS } from '@contracts/supplier';
import { SUPPLIER_MEMBER_REPOSITORY } from '@supplier/repositories';
import { SupplierService } from '@supplier/services/supplier.service';
import { RegisterSupplierHandler } from '@supplier/commands/register-supplier.handler';
import { RegisterSupplierCommand } from '@supplier/commands/register-supplier.command';

describe('RegisterSupplierHandler', () => {
   let handler: RegisterSupplierHandler;
   const mockSupplierService = {
      registerSupplier: jest.fn(),
   };
   const mockSupplierMemberRepo = {
      findByAccountId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RegisterSupplierHandler,
            { provide: SupplierService, useValue: mockSupplierService },
            { provide: SUPPLIER_MEMBER_REPOSITORY, useValue: mockSupplierMemberRepo },
         ],
      }).compile();

      handler = module.get<RegisterSupplierHandler>(RegisterSupplierHandler);
   });

   it('should register supplier and link to existing member accountId', async () => {
      const createdSupplier = {
         supplierId: 'supp-uuid-1',
         supplierName: 'Organic Greens',
         supplierSlug: 'organic-greens',
         supplierCode: 'SUP-OG',
         rating: 5,
         isVerified: false,
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
      };
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue({
         memberId: 'mem-1',
         accountId: 'acc-1',
         supplierId: null,
      });
      mockSupplierService.registerSupplier.mockResolvedValue(createdSupplier);

      const command = new RegisterSupplierCommand({ supplierName: 'Organic Greens' }, 'acc-1');
      const result = await handler.execute(command);

      expect(result.supplierId).toBe('supp-uuid-1');
      expect(mockSupplierMemberRepo.update).toHaveBeenCalledWith('mem-1', {
         supplierId: 'supp-uuid-1',
      });
   });

   it('should throw ConflictException if member already linked to a supplier', async () => {
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue({
         memberId: 'mem-1',
         accountId: 'acc-1',
         supplierId: 'existing-supp-id',
      });

      const command = new RegisterSupplierCommand({ supplierName: 'Organic Greens' }, 'acc-1');
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
   });
});
