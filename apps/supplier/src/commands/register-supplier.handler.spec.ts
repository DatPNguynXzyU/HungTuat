import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@common';
import { SUPPLIER_ROLES, SUPPLIER_STATUS } from '@contracts/supplier';
import { SUPPLIER_MEMBER_REPOSITORY } from '@supplier/repositories';
import { SupplierService } from '@supplier/services/supplier.service';
import { RegisterSupplierHandler } from '@supplier/commands/register-supplier.handler';
import { RegisterSupplierCommand } from '@supplier/commands/register-supplier.command';
import { SUPPLIER_EVENT_PUBLISHER } from '@supplier/publishers';

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
   const mockEventPublisher = {
      publishOnboardingCompleted: jest.fn().mockResolvedValue(undefined),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RegisterSupplierHandler,
            { provide: SupplierService, useValue: mockSupplierService },
            { provide: SUPPLIER_MEMBER_REPOSITORY, useValue: mockSupplierMemberRepo },
            { provide: SUPPLIER_EVENT_PUBLISHER, useValue: mockEventPublisher },
         ],
      }).compile();

      handler = module.get<RegisterSupplierHandler>(RegisterSupplierHandler);
   });

   it('should register supplier, link to existing member accountId, and publish onboarding event', async () => {
      const createdSupplier = {
         supplierId: 'supp-uuid-1',
         supplierName: 'Organic Greens',
         supplierSlug: 'organic-greens',
         supplierCode: 'SUP-OG',
         contactEmail: 'greens@example.com',
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
      expect(mockEventPublisher.publishOnboardingCompleted).toHaveBeenCalledWith({
         accountId: 'acc-1',
         supplierId: 'supp-uuid-1',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         email: 'greens@example.com',
         supplierName: 'Organic Greens',
      });
   });

   it('should register supplier, create new member, and publish onboarding event when no existing member', async () => {
      const createdSupplier = {
         supplierId: 'supp-uuid-2',
         supplierName: 'Fresh Farms',
         supplierSlug: 'fresh-farms',
         supplierCode: 'SUP-FF',
         contactEmail: 'farms@example.com',
         rating: 5,
         isVerified: false,
         supplierStatus: SUPPLIER_STATUS.ACTIVE,
      };
      mockSupplierMemberRepo.findByAccountId.mockResolvedValue(null);
      mockSupplierService.registerSupplier.mockResolvedValue(createdSupplier);

      const command = new RegisterSupplierCommand({ supplierName: 'Fresh Farms' }, 'acc-2');
      const result = await handler.execute(command);

      expect(result.supplierId).toBe('supp-uuid-2');
      expect(mockSupplierMemberRepo.create).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'acc-2',
            supplierId: 'supp-uuid-2',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         }),
      );
      expect(mockEventPublisher.publishOnboardingCompleted).toHaveBeenCalledWith({
         accountId: 'acc-2',
         supplierId: 'supp-uuid-2',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         email: 'farms@example.com',
         supplierName: 'Fresh Farms',
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
      expect(mockEventPublisher.publishOnboardingCompleted).not.toHaveBeenCalled();
   });
});
