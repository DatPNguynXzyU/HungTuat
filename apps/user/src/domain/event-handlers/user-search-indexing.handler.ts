import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_EVENTS } from '@contracts/user';
import {
   USER_DOMAIN_EVENTS,
   UserCreatedEvent,
   UserUpdatedEvent,
   UserDeletedEvent,
   UserRestoredEvent,
} from '@user/domain/events';
import { SEARCH_ADAPTER, type ISearchAdapter } from '@user/adapters/search';

/**
 * Observer Pattern: UserSearchIndexingHandler
 *
 * Decouples search indexing synchronization from core profile operations.
 * Subscribes to User domain lifecycle events and delegates indexing via ISearchAdapter.
 */
@Injectable()
export class UserSearchIndexingHandler {
   private readonly logger = new Logger(UserSearchIndexingHandler.name);

   constructor(
      @Inject(SEARCH_ADAPTER)
      private readonly searchAdapter: ISearchAdapter,
   ) {}

   @OnEvent(USER_DOMAIN_EVENTS.USER_CREATED, { async: true })
   handleUserCreated(event: UserCreatedEvent): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.CREATED, {
            userId: event.userId,
            username: event.username,
            displayName: event.displayName,
            createdAt: event.createdAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit search index for created user ${event.userId}: ${String(err)}`);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_UPDATED, { async: true })
   handleUserUpdated(event: UserUpdatedEvent): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.UPDATED, {
            userId: event.userId,
            ...event.changes,
            updatedAt: event.updatedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit search index for updated user ${event.userId}: ${String(err)}`);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_RESTORED, { async: true })
   handleUserRestored(event: UserRestoredEvent): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.CREATED, {
            userId: event.userId,
            accountId: event.accountId,
            restoredAt: event.restoredAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit search index for restored user ${event.userId}: ${String(err)}`);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_DELETED, { async: true })
   handleUserDeleted(event: UserDeletedEvent): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.DELETED, {
            userId: event.userId,
            deletedAt: event.deletedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit search delete for user ${event.userId}: ${String(err)}`);
      }
   }
}
