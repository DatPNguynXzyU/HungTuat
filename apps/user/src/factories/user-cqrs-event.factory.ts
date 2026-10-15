import { Injectable } from '@nestjs/common';
import { USER_STREAM_PREFIXES } from '@user/cqrs/constants/user-cqrs.constant';
import type { AppendUserEventDto } from '@user/cqrs/write/user-event.interface';
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
import type { IUserCqrsEventFactory } from '@user/factories/user-cqrs-event.factory.interface';

/**
 * Factory responsible for mapping domain events to immutable CQRS event store AppendUserEventDto objects.
 * Encapsulates stream ID conventions, payload serialization, and event metadata.
 */
@Injectable()
export class UserCqrsEventFactory implements IUserCqrsEventFactory {
   createUserStreamId(userId: string): string {
      return `${USER_STREAM_PREFIXES.USER}-${userId}`;
   }

   createFollowStreamId(followerId: string, followingId: string): string {
      return `${USER_STREAM_PREFIXES.FOLLOW}-${followerId}-${followingId}`;
   }

   fromUserCreated(event: UserCreatedEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.USER_CREATED,
         data: {
            userId: event.userId,
            accountId: event.accountId,
            username: event.username,
            displayName: event.displayName,
            createdAt: event.createdAt.toISOString(),
         },
         createdAt: event.createdAt,
         metadata: { userId: event.userId },
      };
   }

   fromUserUpdated(event: UserUpdatedEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
         data: {
            userId: event.userId,
            accountId: event.accountId,
            changes: event.changes,
            updatedAt: event.updatedAt.toISOString(),
         },
         createdAt: event.updatedAt,
         metadata: { userId: event.userId },
      };
   }

   fromUserDeleted(event: UserDeletedEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.USER_DELETED,
         data: {
            userId: event.userId,
            accountId: event.accountId,
         },
         metadata: { userId: event.userId },
      };
   }

   fromUserRestored(event: UserRestoredEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.USER_RESTORED,
         data: {
            userId: event.userId,
            accountId: event.accountId,
         },
         createdAt: event.restoredAt,
         metadata: { userId: event.userId },
      };
   }

   fromUsernameChanged(event: UsernameChangedEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.USERNAME_CHANGED,
         data: {
            userId: event.userId,
            oldUsername: event.oldUsername,
            newUsername: event.newUsername,
            changedAt: event.changedAt.toISOString(),
         },
         createdAt: event.changedAt,
         metadata: { userId: event.userId },
      };
   }

   fromUserFollowed(event: UserFollowedEvent): AppendUserEventDto {
      return {
         streamId: this.createFollowStreamId(event.followerId, event.followingId),
         eventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
         data: {
            followId: event.followId,
            followerId: event.followerId,
            followingId: event.followingId,
            status: event.status,
            followedAt: event.followedAt.toISOString(),
         },
         createdAt: event.followedAt,
         metadata: { userId: event.followerId, targetUserId: event.followingId },
      };
   }

   fromUserUnfollowed(event: UserUnfollowedEvent): AppendUserEventDto {
      return {
         streamId: this.createFollowStreamId(event.followerId, event.followingId),
         eventType: USER_DOMAIN_EVENTS.USER_UNFOLLOWED,
         data: {
            followerId: event.followerId,
            followingId: event.followingId,
            unfollowedAt: event.unfollowedAt.toISOString(),
         },
         createdAt: event.unfollowedAt,
         metadata: { userId: event.followerId, targetUserId: event.followingId },
      };
   }

   fromFollowRequestAccepted(event: FollowRequestAcceptedEvent): AppendUserEventDto {
      return {
         streamId: this.createFollowStreamId(event.followerId, event.followingId),
         eventType: USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED,
         data: {
            followId: event.followId,
            followerId: event.followerId,
            followingId: event.followingId,
            acceptedAt: event.acceptedAt.toISOString(),
         },
         createdAt: event.acceptedAt,
         metadata: { userId: event.followerId, targetUserId: event.followingId },
      };
   }

   fromFollowRequestRejected(event: FollowRequestRejectedEvent): AppendUserEventDto {
      return {
         streamId: this.createFollowStreamId(event.followerId, event.followingId),
         eventType: USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED,
         data: {
            followId: event.followId,
            followerId: event.followerId,
            followingId: event.followingId,
            rejectedAt: event.rejectedAt.toISOString(),
         },
         createdAt: event.rejectedAt,
         metadata: { userId: event.followerId, targetUserId: event.followingId },
      };
   }

   fromAvatarUploaded(event: AvatarUploadedEvent): AppendUserEventDto {
      return {
         streamId: this.createUserStreamId(event.userId),
         eventType: USER_DOMAIN_EVENTS.AVATAR_UPLOADED,
         data: {
            userId: event.userId,
            avatarUrl: event.avatarUrl,
            uploadedAt: event.uploadedAt.toISOString(),
         },
         createdAt: event.uploadedAt,
         metadata: { userId: event.userId },
      };
   }
}
