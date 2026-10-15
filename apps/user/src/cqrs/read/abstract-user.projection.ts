import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_CQRS_EVENTS, USER_CQRS_LOG_MESSAGES } from '@user/cqrs/constants/user-cqrs.constant';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';

/**
 * AbstractUserProjection defines the GoF Template Method Pattern skeleton
 * for CQRS read-model event projections.
 *
 * Invariant Template Algorithm:
 * 1. Subscribes asynchronously to CQRS EVENT_APPENDED events.
 * 2. Invokes the concrete `project(event)` primitive step.
 * 3. Triggers the optional `onProjected(event)` hook on success.
 * 4. Intercepts exceptions, generates structured diagnostics with type-safe constants,
 *    and triggers the optional `onProjectError(event, error)` hook.
 */
@Injectable()
export abstract class AbstractUserProjection {
   protected readonly logger = new Logger(this.constructor.name);

   /**
    * The Template Method: Orchestrates event consumption, projection execution, and standardized error capture.
    */
   @OnEvent(USER_CQRS_EVENTS.EVENT_APPENDED, { async: true })
   async handleEvent(event: UserStoredEvent): Promise<void> {
      try {
         await this.project(event);
         this.onProjected(event);
      } catch (err: unknown) {
         this.logger.error(this.formatErrorMessage(event, err), err instanceof Error ? err.stack : undefined);
         this.onProjectError(event, err);
      }
   }

   /**
    * Optional hook: Invoked immediately following successful projection execution.
    */
   protected onProjected(_event: UserStoredEvent): void {
      // Hook for concrete projections
   }

   /**
    * Optional hook: Invoked when projection fails, before completing error handling.
    */
   protected onProjectError(_event: UserStoredEvent, _error: unknown): void {
      // Hook for concrete projections
   }

   /**
    * Formats structured, standardized error diagnostics adhering to no-hardcoding principles.
    */
   protected formatErrorMessage(event: UserStoredEvent, err: unknown): string {
      return `${USER_CQRS_LOG_MESSAGES.PROJECTION_FAILED} [${this.getProjectionName()}] for event ${event.eventType} (${event.eventId}): ${err instanceof Error ? err.message : String(err)}`;
   }

   // Abstract Primitive Operations (Required by concrete projection subclasses)

   /**
    * Executes the domain projection into the specific read model (Redis or PostgreSQL).
    */
   abstract project(event: UserStoredEvent): Promise<void>;

   /**
    * Returns the unique identifier or constant name for this projection.
    */
   protected abstract getProjectionName(): string;
}
