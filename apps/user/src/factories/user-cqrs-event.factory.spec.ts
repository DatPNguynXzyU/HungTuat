import { FollowStatus } from '@user/entities';
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
import { UserCqrsEventFactory } from '@user/factories/user-cqrs-event.factory';

describe('UserCqrsEventFactory', () => {
   let factory: UserCqrsEventFactory;

   beforeEach(() => {
      factory = new UserCqrsEventFactory();
   });

   it('should generate stream IDs correctly', () => {
      expect(factory.createUserStreamId('u1')).toBe('user-u1');
      expect(factory.createFollowStreamId('u1', 'u2')).toBe('follow-u1-u2');
   });

   it('should map UserCreatedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UserCreatedEvent('u1', 'acc1', 'john', 'John Doe', date);
      const dto = factory.fromUserCreated(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_CREATED);
      expect(dto.data).toEqual({
         userId: 'u1',
         accountId: 'acc1',
         username: 'john',
         displayName: 'John Doe',
         createdAt: date.toISOString(),
      });
      expect(dto.metadata).toEqual({ userId: 'u1' });
   });

   it('should map UserUpdatedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UserUpdatedEvent('u1', 'acc1', { bio: 'hello' }, date);
      const dto = factory.fromUserUpdated(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_UPDATED);
      expect(dto.data).toEqual({
         userId: 'u1',
         accountId: 'acc1',
         changes: { bio: 'hello' },
         updatedAt: date.toISOString(),
      });
   });

   it('should map UserDeletedEvent', () => {
      const event = new UserDeletedEvent('u1', 'acc1');
      const dto = factory.fromUserDeleted(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_DELETED);
      expect(dto.data).toEqual({ userId: 'u1', accountId: 'acc1' });
   });

   it('should map UserRestoredEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UserRestoredEvent('u1', 'acc1', date);
      const dto = factory.fromUserRestored(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_RESTORED);
      expect(dto.data).toEqual({ userId: 'u1', accountId: 'acc1' });
   });

   it('should map UsernameChangedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UsernameChangedEvent('u1', 'old', 'new', date);
      const dto = factory.fromUsernameChanged(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USERNAME_CHANGED);
      expect(dto.data).toEqual({
         userId: 'u1',
         oldUsername: 'old',
         newUsername: 'new',
         changedAt: date.toISOString(),
      });
   });

   it('should map UserFollowedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UserFollowedEvent('f1', 'u1', 'u2', FollowStatus.ACCEPTED, date);
      const dto = factory.fromUserFollowed(event);

      expect(dto.streamId).toBe('follow-u1-u2');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_FOLLOWED);
      expect(dto.data).toEqual({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
         followedAt: date.toISOString(),
      });
      expect(dto.metadata).toEqual({ userId: 'u1', targetUserId: 'u2' });
   });

   it('should map UserUnfollowedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new UserUnfollowedEvent('u1', 'u2', date);
      const dto = factory.fromUserUnfollowed(event);

      expect(dto.streamId).toBe('follow-u1-u2');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.USER_UNFOLLOWED);
      expect(dto.metadata).toEqual({ userId: 'u1', targetUserId: 'u2' });
   });

   it('should map FollowRequestAcceptedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new FollowRequestAcceptedEvent('f1', 'u1', 'u2', date);
      const dto = factory.fromFollowRequestAccepted(event);

      expect(dto.streamId).toBe('follow-u1-u2');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED);
   });

   it('should map FollowRequestRejectedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new FollowRequestRejectedEvent('f1', 'u1', 'u2', date);
      const dto = factory.fromFollowRequestRejected(event);

      expect(dto.streamId).toBe('follow-u1-u2');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED);
   });

   it('should map AvatarUploadedEvent', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      const event = new AvatarUploadedEvent('u1', 'https://avatar.url', date);
      const dto = factory.fromAvatarUploaded(event);

      expect(dto.streamId).toBe('user-u1');
      expect(dto.eventType).toBe(USER_DOMAIN_EVENTS.AVATAR_UPLOADED);
   });
});
