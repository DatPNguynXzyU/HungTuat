import { SUPPLIER_MEMBER_STATUS, SUPPLIER_ROLES } from '@contracts/supplier';
import { HandleSupplierRegisteredCommand } from '@supplier/commands/handle-supplier-registered.command';
import { HandleSupplierRegisteredHandler } from '@supplier/commands/handle-supplier-registered.handler';
import type { ISupplierMemberRepository } from '@supplier/repositories';

describe('HandleSupplierRegisteredHandler', () => {
   let handler: HandleSupplierRegisteredHandler;
   let repository: jest.Mocked<ISupplierMemberRepository>;

   beforeEach(() => {
      repository = {
         findById: jest.fn(),
         findByAccountId: jest.fn(),
         findBySupplierId: jest.fn(),
         create: jest.fn(),
         update: jest.fn(),
         softDelete: jest.fn(),
      };
      handler = new HandleSupplierRegisteredHandler(repository);
   });

   it('should return existing member if already registered (idempotency)', async () => {
      const existingMember = {
         memberId: 'mem-1',
         supplierId: null,
         accountId: 'acc-1',
         email: 'admin@supplier.com',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         createdAt: new Date(),
         updatedAt: new Date(),
      };
      repository.findByAccountId.mockResolvedValue(existingMember);

      const command = new HandleSupplierRegisteredCommand({
         accountId: 'acc-1',
         email: 'admin@supplier.com',
      });
      const result = await handler.execute(command);

      expect(result).toEqual(existingMember);
      expect(repository.create).not.toHaveBeenCalled();
   });

   it('should create new supplier member if not exists', async () => {
      repository.findByAccountId.mockResolvedValue(null);
      const createdMember = {
         memberId: 'mem-2',
         supplierId: null,
         accountId: 'acc-2',
         email: 'admin2@supplier.com',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         createdAt: new Date(),
         updatedAt: new Date(),
      };
      repository.create.mockResolvedValue(createdMember);

      const command = new HandleSupplierRegisteredCommand({
         accountId: 'acc-2',
         email: 'admin2@supplier.com',
      });
      const result = await handler.execute(command);

      expect(result).toEqual(createdMember);
      expect(repository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'acc-2',
            email: 'admin2@supplier.com',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
            memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         }),
      );
   });

   it('should return null when accountId is missing', async () => {
      const command = new HandleSupplierRegisteredCommand({
         accountId: '',
         email: 'admin@supplier.com',
      });
      const result = await handler.execute(command);

      expect(result).toBeNull();
      expect(repository.findByAccountId).not.toHaveBeenCalled();
   });
});
