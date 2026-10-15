import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_EVENT_STORE } from '@user/cqrs/constants/user-cqrs.constant';
import type { IUserEventStore } from '@user/cqrs/write/user-event-store.interface';
import { USER_CQRS_EVENT_FACTORY } from '@user/constants';
import { UserCqrsEventFactory, type IUserCqrsEventFactory } from '@user/factories';
import {
   USER_DOMAIN_EVENTS,
   UserCreatedEvent,
   UserUpdatedEvent,
   UserDeletedEvent,
   UserRestoredEvent,
   UsernameChangedEvent,
   UserFollowedEvent,
   UserUnfollowedEvent,
   FollowRequestAcceptedEvent,
   FollowRequestRejectedEvent,
   AvatarUploadedEvent,
} from '@user/domain/events';

/**
 * Event Sourcing Listener:
 * Subscribes to User domain events and persists them into the immutable UserEventStore.
 * Ensures all state mutations are recorded as a sequence of events.
 * Uses UserCqrsEventFactory to map domain events into store DTOs.
 */
@Injectable()
export class UserEventSourcingListener {
   private readonly logger = new Logger(UserEventSourcingListener.name);
   private readonly cqrsEventFactory: IUserCqrsEventFactory;

   constructor(
      @Inject(USER_EVENT_STORE)
      private readonly eventStore: IUserEventStore,
      @Optional()
      @Inject(USER_CQRS_EVENT_FACTORY)
      cqrsEventFactory?: IUserCqrsEventFactory,
   ) {
      this.cqrsEventFactory = cqrsEventFactory ?? new UserCqrsEventFactory();
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_CREATED, { async: true })
   async onUserCreated(event: UserCreatedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserCreated(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.USER_CREATED} event for ${event.userId}`, err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_UPDATED, { async: true })
   async onUserUpdated(event: UserUpdatedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserUpdated(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.USER_UPDATED} event for ${event.userId}`, err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_DELETED, { async: true })
   async onUserDeleted(event: UserDeletedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserDeleted(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.USER_DELETED} event for ${event.userId}`, err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_RESTORED, { async: true })
   async onUserRestored(event: UserRestoredEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserRestored(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.USER_RESTORED} event for ${event.userId}`, err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USERNAME_CHANGED, { async: true })
   async onUsernameChanged(event: UsernameChangedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUsernameChanged(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.USERNAME_CHANGED} event for ${event.userId}`, err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_FOLLOWED, { async: true })
   async onUserFollowed(event: UserFollowedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserFollowed(event));
      } catch (err: unknown) {
         this.logger.error(
            `Failed to store ${USER_DOMAIN_EVENTS.USER_FOLLOWED} event for ${event.followerId} -> ${event.followingId}`,
            err,
         );
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_UNFOLLOWED, { async: true })
   async onUserUnfollowed(event: UserUnfollowedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromUserUnfollowed(event));
      } catch (err: unknown) {
         this.logger.error(
            `Failed to store ${USER_DOMAIN_EVENTS.USER_UNFOLLOWED} event for ${event.followerId} -> ${event.followingId}`,
            err,
         );
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED, { async: true })
   async onFollowRequestAccepted(event: FollowRequestAcceptedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromFollowRequestAccepted(event));
      } catch (err: unknown) {
         this.logger.error(
            `Failed to store ${USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED} event for follow ${event.followId}`,
            err,
         );
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED, { async: true })
   async onFollowRequestRejected(event: FollowRequestRejectedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromFollowRequestRejected(event));
      } catch (err: unknown) {
         this.logger.error(
            `Failed to store ${USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED} event for follow ${event.followId}`,
            err,
         );
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.AVATAR_UPLOADED, { async: true })
   async onAvatarUploaded(event: AvatarUploadedEvent): Promise<void> {
      try {
         await this.eventStore.appendEvent(this.cqrsEventFactory.fromAvatarUploaded(event));
      } catch (err: unknown) {
         this.logger.error(`Failed to store ${USER_DOMAIN_EVENTS.AVATAR_UPLOADED} event for ${event.userId}`, err);
      }
   }
}
