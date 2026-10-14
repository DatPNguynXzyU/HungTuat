import { Logger } from '@nestjs/common';

export interface SagaStep<TContext> {
   name: string;
   execute: (context: TContext) => Promise<unknown>;
   compensate: (context: TContext, error: unknown) => Promise<void>;
}

export class SagaCompensationError extends Error {
   constructor(
      message: string,
      public readonly originalError: unknown,
      public readonly compensationErrors: Array<{ stepName: string; error: unknown }>,
   ) {
      super(message);
      this.name = 'SagaCompensationError';
   }
}

export class Saga<TContext> {
   private readonly logger = new Logger(Saga.name);
   private readonly steps: SagaStep<TContext>[] = [];

   constructor(private readonly sagaName = 'DistributedSaga') {}

   addStep(step: SagaStep<TContext>): this {
      this.steps.push(step);
      return this;
   }

   async execute(context: TContext): Promise<TContext> {
      const executedSteps: SagaStep<TContext>[] = [];

      for (const step of this.steps) {
         try {
            this.logger.debug(`[${this.sagaName}] Executing step: ${step.name}`);
            await step.execute(context);
            executedSteps.push(step);
         } catch (stepError) {
            this.logger.error(
               `[${this.sagaName}] Step "${step.name}" failed: ${stepError instanceof Error ? stepError.message : String(stepError)}. Starting compensation...`,
               stepError instanceof Error ? stepError.stack : undefined,
            );

            await this.compensate(executedSteps, context, stepError);
            throw stepError;
         }
      }

      this.logger.debug(`[${this.sagaName}] Saga completed successfully`);
      return context;
   }

   private async compensate(
      executedSteps: SagaStep<TContext>[],
      context: TContext,
      originalError: unknown,
   ): Promise<void> {
      const compensationErrors: Array<{ stepName: string; error: unknown }> = [];

      // Compensate executed steps in reverse order (LIFO)
      for (const step of [...executedSteps].reverse()) {
         try {
            this.logger.debug(`[${this.sagaName}] Compensating step: ${step.name}`);
            await step.compensate(context, originalError);
         } catch (compError) {
            this.logger.error(
               `[${this.sagaName}] Compensation failed for step "${step.name}": ${compError instanceof Error ? compError.message : String(compError)}`,
               compError instanceof Error ? compError.stack : undefined,
            );
            compensationErrors.push({ stepName: step.name, error: compError });
         }
      }

      if (compensationErrors.length > 0) {
         this.logger.error(`[${this.sagaName}] Saga finished with ${compensationErrors.length} compensation error(s).`);
      }
   }
}
