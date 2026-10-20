import { AsyncLocalStorage } from 'node:async_hooks';

export interface IGrpcTraceContext {
   correlationId: string;
   requestId?: string;
   userId?: string;
   callerService?: string;
   metadata: Record<string, string>;
}

/**
 * AsyncLocalStorage storage for gRPC request tracing context.
 * Enables accessing the active correlation ID and metadata across asynchronous execution chains
 * without requiring explicit parameter passing across layers.
 */
export class GrpcTraceStorage {
   private static readonly storage = new AsyncLocalStorage<IGrpcTraceContext>();

   /**
    * Executes a callback within the scope of the given gRPC trace context.
    */
   static run<R>(context: IGrpcTraceContext, fn: () => R): R {
      return this.storage.run(context, fn);
   }

   /**
    * Retrieves the active trace context, or undefined if invoked outside an active gRPC call scope.
    */
   static getTrace(): IGrpcTraceContext | undefined {
      return this.storage.getStore();
   }

   /**
    * Retrieves the active correlation ID, or undefined if invoked outside an active gRPC call scope.
    */
   static getCorrelationId(): string | undefined {
      return this.storage.getStore()?.correlationId;
   }
}
