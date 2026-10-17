import type { FollowStatus } from '@user/entities';
import type {
   UserCreatedEvent,
   UserUpdatedEvent,
   UserDeletedEvent,
   UserRestoredEvent,
   UsernameChangedEvent,
   DisplayNameChangedEvent,
   BioChangedEvent,
   ProfileMetadataUpdatedEvent,
   UserFollowedEvent,
   UserUnfollowedEvent,
   FollowRequestAcceptedEvent,
   FollowRequestRejectedEvent,
   AvatarUploadedEvent,
} from '@user/domain/events';

export const USER_DOMAIN_EVENT_FACTORY = 'USER_DOMAIN_EVENT_FACTORY';

export interface IUserDomainEventFactory {
   createUserCreated(
      userId: string,
      accountId: string,
      username: string | null,
      displayName: string | null,
      createdAt?: Date,
   ): UserCreatedEvent;

   createUserUpdated(
      userId: string,
      accountId: string,
      changes: Record<string, unknown>,
      updatedAt?: Date,
   ): UserUpdatedEvent;

   createUserDeleted(userId: string, accountId: string): UserDeletedEvent;

   createUserRestored(userId: string, accountId: string, restoredAt?: Date): UserRestoredEvent;

   createUsernameChanged(
      userId: string,
      oldUsername: string | null,
      newUsername: string,
      changedAt?: Date,
   ): UsernameChangedEvent;

   createDisplayNameChanged(
      userId: string,
      oldDisplayName: string | null,
      newDisplayName: string | null,
      changedAt?: Date,
   ): DisplayNameChangedEvent;

   createBioChanged(userId: string, oldBio: string | null, newBio: string | null, changedAt?: Date): BioChangedEvent;

   createProfileMetadataUpdated(
      userId: string,
      metadata: Record<string, unknown>,
      updatedAt?: Date,
   ): ProfileMetadataUpdatedEvent;

   createUserFollowed(
      followId: string,
      followerId: string,
      followingId: string,
      status?: FollowStatus,
      followedAt?: Date,
   ): UserFollowedEvent;

   createUserUnfollowed(followerId: string, followingId: string, unfollowedAt?: Date): UserUnfollowedEvent;

   createFollowRequestAccepted(
      followId: string,
      followerId: string,
      followingId: string,
      acceptedAt?: Date,
   ): FollowRequestAcceptedEvent;

   createFollowRequestRejected(
      followId: string,
      followerId: string,
      followingId: string,
      rejectedAt?: Date,
   ): FollowRequestRejectedEvent;

   createAvatarUploaded(userId: string, avatarUrl: string, uploadedAt?: Date): AvatarUploadedEvent;
}
