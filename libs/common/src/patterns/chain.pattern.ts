/**
 * Generic handler interface for the Chain of Responsibility pattern.
 */
export interface IChainHandler<TContext, TResult = void> {
   setNext(handler: IChainHandler<TContext, TResult>): IChainHandler<TContext, TResult>;
   handle(context: TContext): Promise<TResult>;
}

/**
 * Base abstract handler providing default chaining and delegation behavior.
 * Subclasses override `handle()` to perform specific validation or logic,
 * and call `super.handle(context)` to forward control down the chain.
 */
export abstract class AbstractChainHandler<TContext, TResult = void> implements IChainHandler<TContext, TResult> {
   private nextHandler?: IChainHandler<TContext, TResult>;

   setNext(handler: IChainHandler<TContext, TResult>): IChainHandler<TContext, TResult> {
      this.nextHandler = handler;
      return handler;
   }

   async handle(context: TContext): Promise<TResult> {
      if (this.nextHandler) {
         return this.nextHandler.handle(context);
      }
      return undefined as unknown as TResult;
   }
}

/**
 * Chain container that manages and executes a sequential chain of handlers.
 */
export class Chain<TContext, TResult = void> {
   private head?: IChainHandler<TContext, TResult>;
   private tail?: IChainHandler<TContext, TResult>;

   constructor(handlers: IChainHandler<TContext, TResult>[] = []) {
      for (const handler of handlers) {
         this.addHandler(handler);
      }
   }

   addHandler(handler: IChainHandler<TContext, TResult>): this {
      if (!this.head) {
         this.head = handler;
         this.tail = handler;
      } else if (this.tail) {
         this.tail.setNext(handler);
         this.tail = handler;
      }
      return this;
   }

   async execute(context: TContext): Promise<TResult> {
      if (!this.head) {
         return undefined as unknown as TResult;
      }
      return this.head.handle(context);
   }
}
