import { Injectable, Logger } from '@nestjs/common';
import {
   PROFILE_OPERATION_LOG_MESSAGES,
   PROFILE_OPERATION_STEPS,
   type ProfileOperationName,
   type ProfileOperationStep,
} from '@user/constants';
import type { BaseProfileOperationContext, IProfileOperation } from '@user/templates/profile-operation.interface';

/**
 * AbstractProfileOperation defines the GoF Template Method Pattern skeleton
 * for user profile lifecycle operations (Creation, Updates, Username Changes, Deletions, Restorations).
 *
 * Invariant Template Algorithm:
 * 1. Build strongly-typed context from parameters (`createContext`).
 * 2. Execute pre-validation hook (`beforeValidate`) - handles lookups or short-circuit checks.
 * 3. Validate domain invariants and business rules (`validate`) via Validation Pipeline.
 * 4. Execute core persistence mutation (`performOperation`) on repositories.
 * 5. Synchronize infrastructure state (`syncInfrastructure`) - Outbox, Bloom filter, Search index, Domain events.
 * 6. Invoke post-success lifecycle hook (`onSuccess`).
 * 7. Extract and return the final domain entity or result (`extractResult`).
 *
 * Error Handling:
 * In case of failure at any step, `onError` hook is triggered with structured diagnostics before rethrowing.
 */
@Injectable()
export abstract class AbstractProfileOperation<
   TParams,
   TContext extends BaseProfileOperationContext = BaseProfileOperationContext,
   TResult = unknown,
> implements IProfileOperation<TParams, TResult> {
   protected readonly logger = new Logger(this.constructor.name);

   /**
    * The Template Method: Coordinates the invariant execution skeleton of profile lifecycle mutations.
    */
   public async execute(params: TParams): Promise<TResult> {
      const context = this.createContext(params);

      try {
         // Step 1: Pre-validation hook (lookups, resolution, early exit evaluations)
         await this.beforeValidate(context);

         // Short-circuit check (e.g. idempotency or unchanged payload)
         if (context.shortCircuited) {
            return this.extractResult(context, undefined as unknown as TResult);
         }

         // Step 2: Invariant validation step (Chain of Responsibility pipeline)
         if (!context.options?.skipValidation) {
            try {
               await this.validate(context);
            } catch (valErr: unknown) {
               this.logger.warn(this.formatErrorLog(context, PROFILE_OPERATION_STEPS.VALIDATE, valErr));
               throw valErr;
            }
         }

         // Step 3: Main execution step (Database persistence)
         const result = await this.performOperation(context);

         // Step 4: Infrastructure synchronization step (Search, Outbox, Cache, Events)
         try {
            await this.syncInfrastructure(context, result);
         } catch (syncErr: unknown) {
            this.logger.error(
               this.formatErrorLog(context, PROFILE_OPERATION_STEPS.SYNC, syncErr),
               syncErr instanceof Error ? syncErr.stack : undefined,
            );
            throw syncErr;
         }

         // Step 5: Post-success hook
         await this.onSuccess(context, result);

         // Step 6: Extract and return result
         return this.extractResult(context, result);
      } catch (err: unknown) {
         await this.onError(context, err);
         throw err;
      }
   }

   // Abstract Primitive Operations (Required by concrete subclasses)

   /**
    * Initializes strongly-typed execution context from input parameters.
    */
   protected abstract createContext(params: TParams): TContext;

   /**
    * Returns the unique identifier or constant name for this profile operation.
    */
   protected abstract getOperationName(): ProfileOperationName;

   /**
    * Executes the domain persistence mutation (create, update, soft-delete, restore).
    */
   protected abstract performOperation(context: TContext): Promise<TResult>;

   /**
    * Executes infrastructure synchronization (search index, outbox events, bloom filter, domain events).
    */
   protected abstract syncInfrastructure(context: TContext, result: TResult): Promise<void>;

   // Hook Operations (Optional overrides with safe defaults)

   /**
    * Optional hook: Executed prior to validation. Useful for fetching existing user state.
    */
   protected beforeValidate(_context: TContext): Promise<void> {
      return Promise.resolve();
   }

   /**
    * Invariant/Hook: Validates domain preconditions via pipeline or specific specifications.
    */
   protected validate(_context: TContext): Promise<void> {
      return Promise.resolve();
   }

   /**
    * Optional hook: Invoked following successful persistence and synchronization.
    */
   protected onSuccess(_context: TContext, _result: TResult): Promise<void> | void {
      // Default: No-op
   }

   /**
    * Optional hook: Invoked when any step of the template method fails.
    */
   protected onError(context: TContext, err: unknown): Promise<void> | void {
      this.logger.error(
         this.formatErrorLog(context, PROFILE_OPERATION_STEPS.EXECUTE, err),
         err instanceof Error ? err.stack : undefined,
      );
   }

   /**
    * Invariant/Hook: Extracts and returns the final result from context or execution output.
    */
   protected extractResult(_context: TContext, result: TResult): TResult {
      return result;
   }

   /**
    * Formats structured error log adhering to zero hardcoding standards.
    */
   protected formatErrorLog(context: TContext, step: ProfileOperationStep, err: unknown): string {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const targetUser = context.userId || context.accountId || 'anonymous';
      return `${PROFILE_OPERATION_LOG_MESSAGES.OPERATION_FAILED} [${this.getOperationName()}] at step [${step}] for user [${targetUser}]: ${errorMessage}`;
   }
}
