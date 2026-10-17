import { Injectable } from '@nestjs/common';
import type { FollowStatus } from '@user/entities';
import {
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
import type { IUserDomainEventFactory } from '@user/factories/user-domain-event.factory.interface';

/**
 * Factory responsible for creating strongly-typed User Domain Events.
 * Centralizes timestamp generation, invariant parameter passing, and isolates
 * domain event constructors from scattering across service logic.
 */
@Injectable()
export class UserDomainEventFactory implements IUserDomainEventFactory {
   // -- Static Convenience Methods --

   static createUserCreated(
      userId: string,
      accountId: string,
      username: string | null,
      displayName: string | null,
      createdAt?: Date,
   ): UserCreatedEvent {
      return new UserCreatedEvent(userId, accountId, username, displayName, createdAt);
   }

   static createUserUpdated(
      userId: string,
      accountId: string,
      changes: Record<string, unknown>,
      updatedAt?: Date,
   ): UserUpdatedEvent {
      return new UserUpdatedEvent(userId, accountId, changes, updatedAt);
   }

   static createUserDeleted(userId: string, accountId: string): UserDeletedEvent {
      return new UserDeletedEvent(userId, accountId);
   }

   static createUserRestored(userId: string, accountId: string, restoredAt?: Date): UserRestoredEvent {
      return new UserRestoredEvent(userId, accountId, restoredAt);
   }

   static createUsernameChanged(
      userId: string,
      oldUsername: string | null,
      newUsername: string,
      changedAt?: Date,
   ): UsernameChangedEvent {
      return new UsernameChangedEvent(userId, oldUsername, newUsername, changedAt);
   }

   static createDisplayNameChanged(
      userId: string,
      oldDisplayName: string | null,
      newDisplayName: string | null,
      changedAt?: Date,
   ): DisplayNameChangedEvent {
      return new DisplayNameChangedEvent(userId, oldDisplayName, newDisplayName, changedAt);
   }

   static createBioChanged(
      userId: string,
      oldBio: string | null,
      newBio: string | null,
      changedAt?: Date,
   ): BioChangedEvent {
      return new BioChangedEvent(userId, oldBio, newBio, changedAt);
   }

   static createProfileMetadataUpdated(
      userId: string,
      metadata: Record<string, unknown>,
      updatedAt?: Date,
   ): ProfileMetadataUpdatedEvent {
      return new ProfileMetadataUpdatedEvent(userId, metadata, updatedAt);
   }

   static createUserFollowed(
      followId: string,
      followerId: string,
      followingId: string,
      status: FollowStatus,
      followedAt?: Date,
   ): UserFollowedEvent {
      return new UserFollowedEvent(followId, followerId, followingId, status, followedAt);
   }

   static createUserUnfollowed(followerId: string, followingId: string, unfollowedAt?: Date): UserUnfollowedEvent {
      return new UserUnfollowedEvent(followerId, followingId, unfollowedAt);
   }

   static createFollowRequestAccepted(
      followId: string,
      followerId: string,
      followingId: string,
      acceptedAt?: Date,
   ): FollowRequestAcceptedEvent {
      return new FollowRequestAcceptedEvent(followId, followerId, followingId, acceptedAt);
   }

   static createFollowRequestRejected(
      followId: string,
      followerId: string,
      followingId: string,
      rejectedAt?: Date,
   ): FollowRequestRejectedEvent {
      return new FollowRequestRejectedEvent(followId, followerId, followingId, rejectedAt);
   }

   static createAvatarUploaded(userId: string, avatarUrl: string, uploadedAt?: Date): AvatarUploadedEvent {
      return new AvatarUploadedEvent(userId, avatarUrl, uploadedAt);
   }

   // -- Instance Methods for DI Inversion of Control --

   createUserCreated(
      userId: string,
      accountId: string,
      username: string | null,
      displayName: string | null,
      createdAt?: Date,
   ): UserCreatedEvent {
      return UserDomainEventFactory.createUserCreated(userId, accountId, username, displayName, createdAt);
   }

   createUserUpdated(
      userId: string,
      accountId: string,
      changes: Record<string, unknown>,
      updatedAt?: Date,
   ): UserUpdatedEvent {
      return UserDomainEventFactory.createUserUpdated(userId, accountId, changes, updatedAt);
   }

   createUserDeleted(userId: string, accountId: string): UserDeletedEvent {
      return UserDomainEventFactory.createUserDeleted(userId, accountId);
   }

   createUserRestored(userId: string, accountId: string, restoredAt?: Date): UserRestoredEvent {
      return UserDomainEventFactory.createUserRestored(userId, accountId, restoredAt);
   }

   createUsernameChanged(
      userId: string,
      oldUsername: string | null,
      newUsername: string,
      changedAt?: Date,
   ): UsernameChangedEvent {
      return UserDomainEventFactory.createUsernameChanged(userId, oldUsername, newUsername, changedAt);
   }

   createDisplayNameChanged(
      userId: string,
      oldDisplayName: string | null,
      newDisplayName: string | null,
      changedAt?: Date,
   ): DisplayNameChangedEvent {
      return UserDomainEventFactory.createDisplayNameChanged(userId, oldDisplayName, newDisplayName, changedAt);
   }

   createBioChanged(userId: string, oldBio: string | null, newBio: string | null, changedAt?: Date): BioChangedEvent {
      return UserDomainEventFactory.createBioChanged(userId, oldBio, newBio, changedAt);
   }

   createProfileMetadataUpdated(
      userId: string,
      metadata: Record<string, unknown>,
      updatedAt?: Date,
   ): ProfileMetadataUpdatedEvent {
      return UserDomainEventFactory.createProfileMetadataUpdated(userId, metadata, updatedAt);
   }

   createUserFollowed(
      followId: string,
      followerId: string,
      followingId: string,
      status: FollowStatus,
      followedAt?: Date,
   ): UserFollowedEvent {
      return UserDomainEventFactory.createUserFollowed(followId, followerId, followingId, status, followedAt);
   }

   createUserUnfollowed(followerId: string, followingId: string, unfollowedAt?: Date): UserUnfollowedEvent {
      return UserDomainEventFactory.createUserUnfollowed(followerId, followingId, unfollowedAt);
   }

   createFollowRequestAccepted(
      followId: string,
      followerId: string,
      followingId: string,
      acceptedAt?: Date,
   ): FollowRequestAcceptedEvent {
      return UserDomainEventFactory.createFollowRequestAccepted(followId, followerId, followingId, acceptedAt);
   }

   createFollowRequestRejected(
      followId: string,
      followerId: string,
      followingId: string,
      rejectedAt?: Date,
   ): FollowRequestRejectedEvent {
      return UserDomainEventFactory.createFollowRequestRejected(followId, followerId, followingId, rejectedAt);
   }

   createAvatarUploaded(userId: string, avatarUrl: string, uploadedAt?: Date): AvatarUploadedEvent {
      return UserDomainEventFactory.createAvatarUploaded(userId, avatarUrl, uploadedAt);
   }
}
