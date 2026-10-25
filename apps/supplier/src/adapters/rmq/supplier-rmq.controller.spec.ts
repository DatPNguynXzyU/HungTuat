import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QUEUES, RmqService } from '@common';
import { SUPPLIER_MEMBER_STATUS, SUPPLIER_ROLES } from '@contracts/supplier';
import type { RmqContext } from '@nestjs/microservices';
import { SupplierRmqController } from '@supplier/adapters/rmq/supplier-rmq.controller';
import { HandleSupplierRegisteredCommand } from '@supplier/commands';

describe('SupplierRmqController', () => {
   let controller: SupplierRmqController;
   let commandBus: jest.Mocked<CommandBus>;
   let rmqService: jest.Mocked<RmqService>;

   beforeEach(async () => {
      commandBus = {
         execute: jest.fn(),
      } as unknown as jest.Mocked<CommandBus>;

      rmqService = {
         ack: jest.fn(),
         handleError: jest.fn().mockResolvedValue({ action: 'RETRY', retries: 1 }),
      } as unknown as jest.Mocked<RmqService>;

      const module: TestingModule = await Test.createTestingModule({
         controllers: [SupplierRmqController],
         providers: [
            {
               provide: CommandBus,
               useValue: commandBus,
            },
            {
               provide: RmqService,
               useValue: rmqService,
            },
         ],
      }).compile();

      controller = module.get<SupplierRmqController>(SupplierRmqController);
   });

   it('should handle SUPPLIER_REGISTERED event and ack message', async () => {
      const mockResult = {
         memberId: 'mem-1',
         supplierId: null,
         accountId: 'acc-1',
         email: 'sup@test.com',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         createdAt: new Date(),
         updatedAt: new Date(),
      };
      commandBus.execute.mockResolvedValue(mockResult);

      const mockContext = {} as RmqContext;
      const payload = { accountId: 'acc-1', email: 'sup@test.com', role: SUPPLIER_ROLES.SUPPLIER_ADMIN };

      const result = await controller.handleSupplierRegistered(payload, mockContext);

      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(HandleSupplierRegisteredCommand));
      expect(rmqService.ack).toHaveBeenCalledWith(mockContext);
      expect(result).toEqual(mockResult);
   });

   it('should NOT ack and should call handleError when command fails', async () => {
      commandBus.execute.mockRejectedValue(new Error('DB failure'));

      const mockContext = {} as RmqContext;
      const payload = { accountId: 'acc-1', email: 'sup@test.com' };

      await expect(controller.handleSupplierRegistered(payload, mockContext)).rejects.toThrow('DB failure');
      expect(rmqService.ack).not.toHaveBeenCalled();
      expect(rmqService.handleError).toHaveBeenCalledWith(
         expect.any(Error),
         mockContext,
         expect.objectContaining({ queue: QUEUES.SUPPLIER }),
      );
   });
});
