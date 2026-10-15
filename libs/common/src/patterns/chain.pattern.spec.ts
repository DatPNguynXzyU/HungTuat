import { AbstractChainHandler, Chain } from '@common/patterns/chain.pattern';

interface TestContext {
   value: number;
   steps: string[];
}

class StepOneHandler extends AbstractChainHandler<TestContext> {
   override async handle(context: TestContext): Promise<void> {
      context.value += 1;
      context.steps.push('step1');
      return super.handle(context);
   }
}

class StepTwoHandler extends AbstractChainHandler<TestContext> {
   override async handle(context: TestContext): Promise<void> {
      context.value *= 2;
      context.steps.push('step2');
      return super.handle(context);
   }
}

class ShortCircuitHandler extends AbstractChainHandler<TestContext> {
   constructor(private readonly shouldHalt: boolean) {
      super();
   }

   override async handle(context: TestContext): Promise<void> {
      if (this.shouldHalt) {
         context.steps.push('halted');
         return; // halts the chain without calling super.handle
      }
      context.steps.push('continued');
      return super.handle(context);
   }
}

describe('Chain of Responsibility Pattern', () => {
   describe('AbstractChainHandler manual linking', () => {
      it('should pass context sequentially through manually linked handlers', async () => {
         const handler1 = new StepOneHandler();
         const handler2 = new StepTwoHandler();
         handler1.setNext(handler2);

         const context: TestContext = { value: 10, steps: [] };
         await handler1.handle(context);

         expect(context.value).toBe(22); // (10 + 1) * 2
         expect(context.steps).toEqual(['step1', 'step2']);
      });

      it('should stop execution if a handler does not call super.handle', async () => {
         const handler1 = new StepOneHandler();
         const haltHandler = new ShortCircuitHandler(true);
         const handler2 = new StepTwoHandler();

         handler1.setNext(haltHandler).setNext(handler2);

         const context: TestContext = { value: 5, steps: [] };
         await handler1.handle(context);

         expect(context.value).toBe(6); // 5 + 1
         expect(context.steps).toEqual(['step1', 'halted']);
      });

      it('should return undefined if no next handler is configured', async () => {
         const singleHandler = new StepOneHandler();
         const context: TestContext = { value: 0, steps: [] };
         const result = await singleHandler.handle(context);

         expect(result).toBeUndefined();
         expect(context.value).toBe(1);
      });
   });

   describe('Chain container', () => {
      it('should execute all handlers added via constructor or addHandler', async () => {
         const chain = new Chain<TestContext>([new StepOneHandler()]);
         chain.addHandler(new StepTwoHandler());

         const context: TestContext = { value: 2, steps: [] };
         await chain.execute(context);

         expect(context.value).toBe(6); // (2 + 1) * 2
         expect(context.steps).toEqual(['step1', 'step2']);
      });

      it('should gracefully handle empty chains', async () => {
         const emptyChain = new Chain<TestContext>();
         const context: TestContext = { value: 42, steps: [] };

         const result = await emptyChain.execute(context);

         expect(result).toBeUndefined();
         expect(context.value).toBe(42);
         expect(context.steps).toEqual([]);
      });

      it('should propagate exceptions immediately from a failing handler', async () => {
         class ThrowingHandler extends AbstractChainHandler<TestContext> {
            override handle(_context: TestContext): Promise<void> {
               return Promise.reject(new Error('Validation failed'));
            }
         }

         const chain = new Chain<TestContext>([new StepOneHandler(), new ThrowingHandler(), new StepTwoHandler()]);

         const context: TestContext = { value: 1, steps: [] };
         await expect(chain.execute(context)).rejects.toThrow('Validation failed');
         expect(context.steps).toEqual(['step1']);
      });
   });
});
