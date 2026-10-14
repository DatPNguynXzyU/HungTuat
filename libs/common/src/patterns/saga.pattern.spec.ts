import { Saga, SagaStep } from '@common/patterns/saga.pattern';

describe('Saga Pattern', () => {
   interface OrderContext {
      orderId: string;
      charged: boolean;
      inventoryReserved: boolean;
      graphSynced: boolean;
   }

   it('should execute all steps successfully in order', async () => {
      const context: OrderContext = {
         orderId: 'order-1',
         charged: false,
         inventoryReserved: false,
         graphSynced: false,
      };

      const step1: SagaStep<OrderContext> = {
         name: 'ChargePayment',
         execute: jest.fn((ctx) => {
            ctx.charged = true;
            return Promise.resolve();
         }),
         compensate: jest.fn(),
      };

      const step2: SagaStep<OrderContext> = {
         name: 'ReserveInventory',
         execute: jest.fn((ctx) => {
            ctx.inventoryReserved = true;
            return Promise.resolve();
         }),
         compensate: jest.fn(),
      };

      const step3: SagaStep<OrderContext> = {
         name: 'SyncGraph',
         execute: jest.fn((ctx) => {
            ctx.graphSynced = true;
            return Promise.resolve();
         }),
         compensate: jest.fn(),
      };

      const saga = new Saga<OrderContext>('TestOrderSaga');
      saga.addStep(step1).addStep(step2).addStep(step3);

      const result = await saga.execute(context);

      expect(result.charged).toBe(true);
      expect(result.inventoryReserved).toBe(true);
      expect(result.graphSynced).toBe(true);
      expect(step1.compensate).not.toHaveBeenCalled();
      expect(step2.compensate).not.toHaveBeenCalled();
      expect(step3.compensate).not.toHaveBeenCalled();
   });

   it('should compensate executed steps in reverse order when a step fails', async () => {
      const executionOrder: string[] = [];
      const compensationOrder: string[] = [];

      const context: OrderContext = {
         orderId: 'order-2',
         charged: false,
         inventoryReserved: false,
         graphSynced: false,
      };

      const step1: SagaStep<OrderContext> = {
         name: 'ChargePayment',
         execute: jest.fn((ctx) => {
            executionOrder.push('ChargePayment');
            ctx.charged = true;
            return Promise.resolve();
         }),
         compensate: jest.fn((ctx) => {
            compensationOrder.push('ChargePayment');
            ctx.charged = false;
            return Promise.resolve();
         }),
      };

      const step2: SagaStep<OrderContext> = {
         name: 'ReserveInventory',
         execute: jest.fn((ctx) => {
            executionOrder.push('ReserveInventory');
            ctx.inventoryReserved = true;
            return Promise.resolve();
         }),
         compensate: jest.fn((ctx) => {
            compensationOrder.push('ReserveInventory');
            ctx.inventoryReserved = false;
            return Promise.resolve();
         }),
      };

      const step3Error = new Error('Graph sync connection refused');
      const step3: SagaStep<OrderContext> = {
         name: 'SyncGraph',
         execute: jest.fn(() => {
            executionOrder.push('SyncGraph');
            return Promise.reject(step3Error);
         }),
         compensate: jest.fn(),
      };

      const saga = new Saga<OrderContext>('FailedOrderSaga');
      saga.addStep(step1).addStep(step2).addStep(step3);

      await expect(saga.execute(context)).rejects.toThrow('Graph sync connection refused');

      expect(executionOrder).toEqual(['ChargePayment', 'ReserveInventory', 'SyncGraph']);
      // Should compensate in reverse: step 2 first, then step 1
      expect(compensationOrder).toEqual(['ReserveInventory', 'ChargePayment']);
      expect(context.charged).toBe(false);
      expect(context.inventoryReserved).toBe(false);
      expect(step3.compensate).not.toHaveBeenCalled();
   });
});
