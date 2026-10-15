import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { RetryQueueService, Saga } from '@common';
import { FOLLOW_SAGA_LOG_MESSAGES, type FollowSagaName, type FollowSagaStep } from '@user/modules/follow/constants';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/modules/follow/repositories';
import { UNIT_OF_WORK, type IUnitOfWork } from '@user/unit-of-work';

export interface FollowOperationOptions {
   strict?: boolean;
}

export interface BaseFollowContext {
   options?: FollowOperationOptions;
   graphSynced?: boolean;
   graphDeleted?: boolean;
   graphUpdated?: boolean;
}

/**
 * AbstractFollowSaga defines the GoF Template Method Pattern skeleton
 * for dual-write consistency workflows between PostgreSQL and NebulaGraph.
 *
 * Invariant Template Algorithm:
 * 1. Build initial strongly-typed context from execution parameters.
 * 2. Register PostgreSQL transaction step and compensation.
 * 3. Register NebulaGraph synchronization step and compensation with strict/non-strict semantics.
 * 4. Execute the saga transaction pipeline.
 * 5. Extract and return the final domain result.
 */
@Injectable()
export abstract class AbstractFollowSaga<
   TParams,
   TContext extends BaseFollowContext = BaseFollowContext,
   TResult = void,
> {
   protected readonly logger = new Logger(this.constructor.name);

   constructor(
      @Inject(UNIT_OF_WORK)
      protected readonly unitOfWork: IUnitOfWork,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      protected readonly graphFollowRepository: IFollowGraphRepository,
      @Optional()
      protected readonly retryQueueService?: RetryQueueService,
   ) {}

   /**
    * The Template Method: coordinates the execution skeleton of dual-write follow transactions.
    */
   public async execute(params: TParams): Promise<TResult> {
      const context = this.createContext(params);
      const saga = new Saga<TContext>(this.getSagaName());

      saga.addStep({
         name: this.getPostgresStepName(),
         execute: (ctx) => this.executePostgresStep(ctx),
         compensate: (ctx) => this.compensatePostgresStep(ctx),
      });

      saga.addStep({
         name: this.getGraphSyncStepName(),
         execute: (ctx) => this.executeGraphSyncStep(ctx),
         compensate: (ctx) => this.compensateGraphSyncStep(ctx),
      });

      await saga.execute(context);

      return this.extractResult(context);
   }

   /**
    * Standardized NebulaGraph synchronization step:
    * - If strict mode: synchronously executes graph sync, failing fast on errors.
    * - If non-strict mode: executes graph sync with fallback to RetryQueueService if available.
    */
   protected async executeGraphSyncStep(ctx: TContext): Promise<void> {
      if (ctx.options?.strict) {
         await this.performGraphSync(ctx);
         this.markGraphSynced(ctx, true);
         return;
      }

      try {
         await this.performGraphSync(ctx);
         this.markGraphSynced(ctx, true);
      } catch (err: unknown) {
         this.logger.error(this.formatGraphSyncError(ctx, err), err instanceof Error ? err.stack : undefined);

         if (this.retryQueueService) {
            await this.retryQueueService.add(this.getRetryQueueName(), this.getRetryQueuePayload(ctx));
         } else {
            throw err;
         }
      }
   }

   /**
    * Standardized NebulaGraph compensation step:
    * Only triggers compensation if the graph mutation actually succeeded in the forward step.
    */
   protected async compensateGraphSyncStep(ctx: TContext): Promise<void> {
      if (!this.isGraphSynced(ctx)) {
         return;
      }

      try {
         await this.performGraphCompensation(ctx);
      } catch (compErr: unknown) {
         this.logger.error(this.formatGraphCompensationError(ctx, compErr));
      }
   }

   /**
    * Checks whether the graph operation was marked as completed.
    */
   protected isGraphSynced(ctx: TContext): boolean {
      return Boolean(ctx.graphSynced ?? ctx.graphDeleted ?? ctx.graphUpdated);
   }

   /**
    * Marks the graph operation status on context.
    */
   protected markGraphSynced(ctx: TContext, synced = true): void {
      ctx.graphSynced = synced;
      if ('graphDeleted' in ctx) {
         ctx.graphDeleted = synced;
      }
      if ('graphUpdated' in ctx) {
         ctx.graphUpdated = synced;
      }
   }

   /**
    * Formats structured error log for graph sync failure.
    */
   protected formatGraphSyncError(_ctx: TContext, err: unknown): string {
      return `${FOLLOW_SAGA_LOG_MESSAGES.GRAPH_SYNC_FAILED} [${this.getSagaName()}]: ${err instanceof Error ? err.message : String(err)}`;
   }

   /**
    * Formats structured error log for graph compensation failure.
    */
   protected formatGraphCompensationError(_ctx: TContext, compErr: unknown): string {
      return `${FOLLOW_SAGA_LOG_MESSAGES.GRAPH_COMPENSATION_FAILED} [${this.getSagaName()}]: ${compErr instanceof Error ? compErr.message : String(compErr)}`;
   }

   // Abstract Primitive Operations (Required by concrete saga subclasses)

   protected abstract createContext(params: TParams): TContext;
   protected abstract getSagaName(): FollowSagaName;
   protected abstract getPostgresStepName(): FollowSagaStep;
   protected abstract getGraphSyncStepName(): FollowSagaStep;
   protected abstract executePostgresStep(ctx: TContext): Promise<void>;
   protected abstract compensatePostgresStep(ctx: TContext): Promise<void>;
   protected abstract performGraphSync(ctx: TContext): Promise<void>;
   protected abstract performGraphCompensation(ctx: TContext): Promise<void>;
   protected abstract getRetryQueueName(): string;
   protected abstract getRetryQueuePayload(ctx: TContext): Record<string, unknown>;
   protected abstract extractResult(ctx: TContext): TResult;
}
