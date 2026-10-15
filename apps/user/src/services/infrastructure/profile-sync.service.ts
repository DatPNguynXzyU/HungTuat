import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RetryQueueService } from '@common';
import { OutboxService } from '@user/core/outbox';
import { UserEntity } from '@user/core/database/entities';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { UserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.service';
import { SEARCH_ADAPTER, type ISearchAdapter } from '@user/adapters/search';
import { USER_AGGREGATES, USER_EVENTS, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { USER_DOMAIN_EVENTS } from '@user/domain';
import { USER_DOMAIN_EVENT_FACTORY } from '@user/constants';
import { UserDomainEventFactory, type IUserDomainEventFactory } from '@user/factories';
import type { UpdateUserData } from '@user/modules/profile/repositories/user-profile.repository';

/**
 * ProfileSyncService coordinates cross-cutting synchronization concerns:
 * - Search engine indexing (via ISearchAdapter)
 * - Graph database synchronization (via UserGraphSyncService)
 * - Redis Bloom Filter updating (via UsernameBloomFilterService)
 * - Transactional Outbox publishing (via OutboxService)
 * - Local domain event dispatching (via EventEmitter2)
 */
@Injectable()
export class ProfileSyncService {
   private readonly logger = new Logger(ProfileSyncService.name);
   private readonly domainEventFactory: IUserDomainEventFactory;

   constructor(
      private readonly outboxService: OutboxService,
      private readonly userGraphSyncService: UserGraphSyncService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      @Inject(SEARCH_ADAPTER)
      private readonly searchAdapter: ISearchAdapter,
      @Optional()
      private readonly retryQueueService?: RetryQueueService,
      @Optional()
      private readonly eventEmitter?: EventEmitter2,
      @Optional()
      @Inject(USER_DOMAIN_EVENT_FACTORY)
      domainEventFactory?: IUserDomainEventFactory,
   ) {
      this.domainEventFactory = domainEventFactory ?? new UserDomainEventFactory();
   }

   async syncUserCreated(user: UserEntity): Promise<void> {
      if (user.username) {
         await this.usernameBloomFilterService.addUsername(user.username);
      }

      await this.syncGraphWithFallback(user);

      await this.outboxService.createOutboxEvent(user.userId, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_CREATED, {
         userId: user.userId,
         accountId: user.accountId,
         username: user.username,
      });

      this.emitSearchIndexEvent(USER_EVENTS.CREATED, user);

      if (this.eventEmitter) {
         this.eventEmitter.emit(
            USER_DOMAIN_EVENTS.USER_CREATED,
            this.domainEventFactory.createUserCreated(
               user.userId,
               user.accountId,
               user.username,
               user.displayName,
               user.createdAt,
            ),
         );
      }
   }

   async syncUserUpdated(
      user: UserEntity,
      changes: Record<string, unknown> | UpdateUserData,
      previousUser?: UserEntity,
   ): Promise<void> {
      const username = 'username' in changes ? changes.username : undefined;
      if (username && typeof username === 'string') {
         await this.usernameBloomFilterService.addUsername(username);
      }

      await this.syncGraphWithFallback(user);

      const changesPayload: Record<string, unknown> = { ...changes };

      await this.outboxService.createOutboxEvent(user.userId, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_UPDATED, {
         userId: user.userId,
         accountId: user.accountId,
         changes: changesPayload,
      });

      this.emitSearchIndexEvent(USER_EVENTS.UPDATED, user);

      if (this.eventEmitter) {
         if (username && previousUser && previousUser.username?.toLowerCase() !== (username as string).toLowerCase()) {
            this.eventEmitter.emit(
               USER_DOMAIN_EVENTS.USERNAME_CHANGED,
               this.domainEventFactory.createUsernameChanged(user.userId, previousUser.username, username as string),
            );
         }

         this.eventEmitter.emit(
            USER_DOMAIN_EVENTS.USER_UPDATED,
            this.domainEventFactory.createUserUpdated(user.userId, user.accountId, changesPayload, user.updatedAt),
         );
      }
   }

   async syncUserDeleted(userId: string, accountId: string): Promise<void> {
      this.emitSearchDeleteEvent(userId);

      await this.outboxService.createOutboxEvent(userId, USER_AGGREGATES.USER, USER_OUTBOX_EVENTS.USER_DELETED, {
         userId,
         accountId,
      });

      if (this.eventEmitter) {
         this.eventEmitter.emit(
            USER_DOMAIN_EVENTS.USER_DELETED,
            this.domainEventFactory.createUserDeleted(userId, accountId),
         );
      }
   }

   async syncUserRestored(restoredUser: UserEntity): Promise<void> {
      this.emitSearchIndexEvent(USER_EVENTS.CREATED, restoredUser);

      await this.outboxService.createOutboxEvent(
         restoredUser.userId,
         USER_AGGREGATES.USER,
         USER_OUTBOX_EVENTS.USER_RESTORED,
         {
            userId: restoredUser.userId,
            accountId: restoredUser.accountId,
         },
      );

      if (this.eventEmitter) {
         this.eventEmitter.emit(
            USER_DOMAIN_EVENTS.USER_RESTORED,
            this.domainEventFactory.createUserRestored(restoredUser.userId, restoredUser.accountId),
         );
      }
   }

   emitSearchIndexEvent(event: string, user: UserEntity): void {
      const payload = {
         userId: user.userId,
         username: user.username,
         displayName: user.displayName,
         avatar: user.avatar,
         bio: user.bio,
         isVerified: user.isVerified,
         followersCount: user.followersCount,
         followingCount: user.followingCount,
         createdAt: user.createdAt,
         updatedAt: user.updatedAt,
      };

      try {
         this.searchAdapter.emitIndexEvent(event, payload);
      } catch (err) {
         this.logger.warn(`Failed to emit ${event} to Search Service for user ${user.userId}: ${String(err)}`);
      }
   }

   emitSearchDeleteEvent(userId: string): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.DELETED, { userId });
      } catch (err) {
         this.logger.warn(`Failed to emit ${USER_EVENTS.DELETED} to Search Service for user ${userId}: ${String(err)}`);
      }
   }

   private async syncGraphWithFallback(user: UserEntity): Promise<void> {
      try {
         await this.userGraphSyncService.syncUserToGraph(user);
      } catch (err) {
         this.logger.warn(`Failed to sync user ${user.userId} to graph: ${String(err)}`);
         if (this.retryQueueService) {
            await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_USER_TO_GRAPH, {
               userId: user.userId,
               username: user.username,
               displayName: user.displayName,
               avatar: user.avatar,
               bio: user.bio,
               isPrivate: user.isPrivate,
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
            });
         }
      }
   }
}
