import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_DOMAIN_EVENTS, UserFollowedEvent, FollowRequestAcceptedEvent } from '@user/domain/events';
import { NOTIFICATION_ADAPTER, type INotificationAdapter } from '@user/adapters/notification';

/**
 * Observer Pattern: UserFollowNotificationHandler
 *
 * Subscribes to follow domain events and dispatches asynchronous notifications
 * to the Notification Microservice via INotificationAdapter, completely decoupling user relationships from transport.
 */
@Injectable()
export class UserFollowNotificationHandler {
   private readonly logger = new Logger(UserFollowNotificationHandler.name);

   constructor(
      @Inject(NOTIFICATION_ADAPTER)
      private readonly notificationAdapter: INotificationAdapter,
   ) {}

   @OnEvent(USER_DOMAIN_EVENTS.USER_FOLLOWED, { async: true })
   async handleUserFollowed(event: UserFollowedEvent): Promise<void> {
      this.logger.log(`Dispatching follow notification from ${event.followerId} to ${event.followingId}`);
      try {
         await this.notificationAdapter.sendUserFollowedNotification({
            followId: event.followId,
            followerId: event.followerId,
            recipientId: event.followingId,
            status: event.status,
            createdAt: event.followedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to dispatch follow notification: ${String(err)}`);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED, { async: true })
   async handleFollowRequestAccepted(event: FollowRequestAcceptedEvent): Promise<void> {
      this.logger.log(`Dispatching follow accept notification to ${event.followerId}`);
      try {
         await this.notificationAdapter.sendFollowAcceptedNotification({
            followId: event.followId,
            recipientId: event.followerId,
            acceptedBy: event.followingId,
            acceptedAt: event.acceptedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to dispatch follow accept notification: ${String(err)}`);
      }
   }
}
