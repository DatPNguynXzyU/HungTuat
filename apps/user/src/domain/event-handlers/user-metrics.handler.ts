import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_METRICS_DOMAIN_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
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
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

/**
 * Observer Pattern: UserMetricsHandler (Observer)
 *
 * Subscribes to all User domain events and handles telemetry, logging,
 * and operational domain metrics without contaminating business services.
 */
@Injectable()
export class UserMetricsHandler {
   private readonly logger = new Logger(UserMetricsHandler.name);

   constructor(
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
   ) {}

   @OnEvent(USER_DOMAIN_EVENTS.USER_CREATED, { async: true })
   handleUserCreated(event: UserCreatedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_CREATED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] User created: ${event.userId} (username: ${event.username ?? 'none'})`);
      } catch (err) {
         this.logger.error('Failed to record user created metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_UPDATED, { async: true })
   handleUserUpdated(event: UserUpdatedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_UPDATED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(
            `[Domain Metric] User updated: ${event.userId} (fields: ${Object.keys(event.changes).join(', ')})`,
         );
      } catch (err) {
         this.logger.error('Failed to record user updated metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_DELETED, { async: true })
   handleUserDeleted(event: UserDeletedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_DELETED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] User soft-deleted: ${event.userId}`);
      } catch (err) {
         this.logger.error('Failed to record user deleted metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_RESTORED, { async: true })
   handleUserRestored(event: UserRestoredEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_RESTORED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] User restored: ${event.userId}`);
      } catch (err) {
         this.logger.error('Failed to record user restored metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USERNAME_CHANGED, { async: true })
   handleUsernameChanged(event: UsernameChangedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USERNAME_CHANGED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(
            `[Domain Metric] Username changed for ${event.userId}: ${event.oldUsername ?? 'none'} -> ${event.newUsername}`,
         );
      } catch (err) {
         this.logger.error('Failed to record username changed metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_FOLLOWED, { async: true })
   handleUserFollowed(event: UserFollowedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(
            `[Domain Metric] Follow established: ${event.followerId} -> ${event.followingId} (status: ${event.status})`,
         );
      } catch (err) {
         this.logger.error('Failed to record user followed metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.USER_UNFOLLOWED, { async: true })
   handleUserUnfollowed(event: UserUnfollowedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.USER_UNFOLLOWED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] Unfollow recorded: ${event.followerId} -> ${event.followingId}`);
      } catch (err) {
         this.logger.error('Failed to record user unfollowed metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED, { async: true })
   handleFollowAccepted(event: FollowRequestAcceptedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] Follow request accepted: ${event.followerId} -> ${event.followingId}`);
      } catch (err) {
         this.logger.error('Failed to record follow accepted metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED, { async: true })
   handleFollowRejected(event: FollowRequestRejectedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.FOLLOW_REJECTED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] Follow request rejected: ${event.followerId} -> ${event.followingId}`);
      } catch (err) {
         this.logger.error('Failed to record follow rejected metrics', err);
      }
   }

   @OnEvent(USER_DOMAIN_EVENTS.AVATAR_UPLOADED, { async: true })
   handleAvatarUploaded(event: AvatarUploadedEvent): void {
      try {
         this.metricsService.recordDomainOperation(
            USER_METRICS_DOMAIN_OPERATIONS.AVATAR_UPLOADED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger.log(`[Domain Metric] Avatar uploaded for user: ${event.userId}`);
      } catch (err) {
         this.logger.error('Failed to record avatar uploaded metrics', err);
      }
   }
}
