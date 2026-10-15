import { FollowStatus } from '@user/entities';
import { UserFollowNotificationHandler } from '@user/domain/event-handlers/user-follow-notification.handler';
import { UserFollowedEvent, FollowRequestAcceptedEvent } from '@user/domain/events';
import type { INotificationAdapter } from '@user/adapters/notification';

describe('UserFollowNotificationHandler', () => {
   let handler: UserFollowNotificationHandler;
   let notificationAdapter: jest.Mocked<INotificationAdapter>;

   beforeEach(() => {
      notificationAdapter = {
         sendUserFollowedNotification: jest.fn().mockResolvedValue(undefined),
         sendFollowAcceptedNotification: jest.fn().mockResolvedValue(undefined),
      };

      handler = new UserFollowNotificationHandler(notificationAdapter);
   });

   it('should dispatch follow notification on UserFollowedEvent', async () => {
      const event = new UserFollowedEvent('f1', 'user-1', 'user-2', FollowStatus.ACCEPTED);
      await handler.handleUserFollowed(event);

      expect(notificationAdapter.sendUserFollowedNotification).toHaveBeenCalledWith(
         expect.objectContaining({
            followId: 'f1',
            followerId: 'user-1',
            recipientId: 'user-2',
            status: FollowStatus.ACCEPTED,
         }),
      );
   });

   it('should dispatch follow accepted notification on FollowRequestAcceptedEvent', async () => {
      const event = new FollowRequestAcceptedEvent('f1', 'user-1', 'user-2');
      await handler.handleFollowRequestAccepted(event);

      expect(notificationAdapter.sendFollowAcceptedNotification).toHaveBeenCalledWith(
         expect.objectContaining({
            followId: 'f1',
            recipientId: 'user-1',
            acceptedBy: 'user-2',
         }),
      );
   });

   it('should catch error without bubbling up when notification fails', async () => {
      notificationAdapter.sendUserFollowedNotification.mockRejectedValueOnce(new Error('Notification failed'));

      await expect(
         handler.handleUserFollowed(new UserFollowedEvent('f1', 'u1', 'u2', FollowStatus.PENDING)),
      ).resolves.toBeUndefined();
   });
});
