import { FollowStatus } from '@user/entities';
import {
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
import { UserDomainEventFactory } from '@user/factories/user-domain-event.factory';

describe('UserDomainEventFactory', () => {
   let factory: UserDomainEventFactory;

   beforeEach(() => {
      factory = new UserDomainEventFactory();
   });

   it('should create UserCreatedEvent via instance and static methods', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event1 = factory.createUserCreated('u1', 'acc1', 'john', 'John Doe', date);
      const event2 = UserDomainEventFactory.createUserCreated('u1', 'acc1', 'john', 'John Doe', date);

      expect(event1).toBeInstanceOf(UserCreatedEvent);
      expect(event1.userId).toBe('u1');
      expect(event1.accountId).toBe('acc1');
      expect(event1.username).toBe('john');
      expect(event1.displayName).toBe('John Doe');
      expect(event1.createdAt).toEqual(date);

      expect(event2).toBeInstanceOf(UserCreatedEvent);
      expect(event2.userId).toBe('u1');
   });

   it('should create UserUpdatedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createUserUpdated('u1', 'acc1', { bio: 'hello' }, date);
      expect(event).toBeInstanceOf(UserUpdatedEvent);
      expect(event.changes).toEqual({ bio: 'hello' });
      expect(event.updatedAt).toEqual(date);
   });

   it('should create UserDeletedEvent via instance and static methods', () => {
      const event = factory.createUserDeleted('u1', 'acc1');
      expect(event).toBeInstanceOf(UserDeletedEvent);
      expect(event.userId).toBe('u1');
      expect(event.accountId).toBe('acc1');
   });

   it('should create UserRestoredEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createUserRestored('u1', 'acc1', date);
      expect(event).toBeInstanceOf(UserRestoredEvent);
      expect(event.userId).toBe('u1');
      expect(event.restoredAt).toEqual(date);
   });

   it('should create UsernameChangedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createUsernameChanged('u1', 'old', 'new', date);
      expect(event).toBeInstanceOf(UsernameChangedEvent);
      expect(event.oldUsername).toBe('old');
      expect(event.newUsername).toBe('new');
   });

   it('should create UserFollowedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createUserFollowed('f1', 'u1', 'u2', FollowStatus.ACCEPTED, date);
      expect(event).toBeInstanceOf(UserFollowedEvent);
      expect(event.followId).toBe('f1');
      expect(event.status).toBe(FollowStatus.ACCEPTED);
   });

   it('should create UserUnfollowedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createUserUnfollowed('u1', 'u2', date);
      expect(event).toBeInstanceOf(UserUnfollowedEvent);
      expect(event.followerId).toBe('u1');
      expect(event.followingId).toBe('u2');
   });

   it('should create FollowRequestAcceptedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createFollowRequestAccepted('f1', 'u1', 'u2', date);
      expect(event).toBeInstanceOf(FollowRequestAcceptedEvent);
      expect(event.followId).toBe('f1');
   });

   it('should create FollowRequestRejectedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createFollowRequestRejected('f1', 'u1', 'u2', date);
      expect(event).toBeInstanceOf(FollowRequestRejectedEvent);
      expect(event.followId).toBe('f1');
   });

   it('should create AvatarUploadedEvent via instance and static methods', () => {
      const date = new Date();
      const event = factory.createAvatarUploaded('u1', 'https://avatar.url', date);
      expect(event).toBeInstanceOf(AvatarUploadedEvent);
      expect(event.avatarUrl).toBe('https://avatar.url');
   });
});
