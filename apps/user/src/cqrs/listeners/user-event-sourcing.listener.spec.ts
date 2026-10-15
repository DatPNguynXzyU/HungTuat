import { Test, type TestingModule } from '@nestjs/testing';
import { UserEventSourcingListener } from '@user/cqrs/listeners/user-event-sourcing.listener';
import { USER_EVENT_STORE } from '@user/cqrs/constants/user-cqrs.constant';
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
import { FollowStatus } from '@user/core/database/entities';

describe('UserEventSourcingListener', () => {
   let listener: UserEventSourcingListener;
   let mockEventStore: {
      appendEvent: jest.Mock;
   };

   beforeEach(async () => {
      mockEventStore = {
         appendEvent: jest.fn().mockResolvedValue({}),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [UserEventSourcingListener, { provide: USER_EVENT_STORE, useValue: mockEventStore }],
      }).compile();

      listener = module.get<UserEventSourcingListener>(UserEventSourcingListener);
   });

   it('should append event on UserCreatedEvent', async () => {
      const event = new UserCreatedEvent('u1', 'acc1', 'john', 'John Doe');
      await listener.onUserCreated(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            data: expect.objectContaining({ userId: 'u1', accountId: 'acc1', username: 'john' }),
         }),
      );
   });

   it('should append event on UserUpdatedEvent', async () => {
      const event = new UserUpdatedEvent('u1', 'acc1', { bio: 'hello' });
      await listener.onUserUpdated(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            data: expect.objectContaining({ userId: 'u1', changes: { bio: 'hello' } }),
         }),
      );
   });

   it('should append event on UserDeletedEvent', async () => {
      const event = new UserDeletedEvent('u1', 'acc1');
      await listener.onUserDeleted(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_DELETED,
            data: { userId: 'u1', accountId: 'acc1' },
         }),
      );
   });

   it('should append event on UserRestoredEvent', async () => {
      const event = new UserRestoredEvent('u1', 'acc1');
      await listener.onUserRestored(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_RESTORED,
            data: { userId: 'u1', accountId: 'acc1' },
         }),
      );
   });

   it('should append event on UsernameChangedEvent', async () => {
      const event = new UsernameChangedEvent('u1', 'old', 'new');
      await listener.onUsernameChanged(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USERNAME_CHANGED,
            data: expect.objectContaining({ userId: 'u1', oldUsername: 'old', newUsername: 'new' }),
         }),
      );
   });

   it('should append event on UserFollowedEvent', async () => {
      const event = new UserFollowedEvent('f1', 'u1', 'u2', FollowStatus.ACCEPTED);
      await listener.onUserFollowed(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
            data: expect.objectContaining({ followId: 'f1', followerId: 'u1', followingId: 'u2' }),
         }),
      );
   });

   it('should append event on UserUnfollowedEvent', async () => {
      const event = new UserUnfollowedEvent('u1', 'u2');
      await listener.onUserUnfollowed(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.USER_UNFOLLOWED,
            data: expect.objectContaining({ followerId: 'u1', followingId: 'u2' }),
         }),
      );
   });

   it('should append event on FollowRequestAcceptedEvent', async () => {
      const event = new FollowRequestAcceptedEvent('f1', 'u1', 'u2');
      await listener.onFollowRequestAccepted(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED,
            data: expect.objectContaining({ followId: 'f1', followerId: 'u1', followingId: 'u2' }),
         }),
      );
   });

   it('should append event on FollowRequestRejectedEvent', async () => {
      const event = new FollowRequestRejectedEvent('f1', 'u1', 'u2');
      await listener.onFollowRequestRejected(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED,
            data: expect.objectContaining({ followId: 'f1', followerId: 'u1', followingId: 'u2' }),
         }),
      );
   });

   it('should append event on AvatarUploadedEvent', async () => {
      const event = new AvatarUploadedEvent('u1', 'https://avatar.png');
      await listener.onAvatarUploaded(event);

      expect(mockEventStore.appendEvent).toHaveBeenCalledWith(
         expect.objectContaining({
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.AVATAR_UPLOADED,
            data: expect.objectContaining({ userId: 'u1', avatarUrl: 'https://avatar.png' }),
         }),
      );
   });
});
