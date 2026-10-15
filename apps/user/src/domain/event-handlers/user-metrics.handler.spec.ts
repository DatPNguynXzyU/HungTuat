import { FollowStatus } from '@user/entities';
import { USER_METRICS_DOMAIN_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import { UserMetricsHandler } from '@user/domain/event-handlers/user-metrics.handler';
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
import type { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

describe('UserMetricsHandler', () => {
   let handler: UserMetricsHandler;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;

   beforeEach(() => {
      mockMetricsService = {
         contentType: 'text/plain',
         getMetrics: jest.fn(),
         recordMediaOperation: jest.fn(),
         recordSearchOperation: jest.fn(),
         recordNotificationOperation: jest.fn(),
         recordDomainOperation: jest.fn(),
         recordGraphSyncOperation: jest.fn(),
         observeMediaDuration: jest.fn(),
         observeSearchDuration: jest.fn(),
         observeGraphSyncDuration: jest.fn(),
         setTotalUsers: jest.fn(),
         setTotalFollows: jest.fn(),
         startTimer: jest.fn(),
         calculateDuration: jest.fn(),
         reset: jest.fn(),
      };

      handler = new UserMetricsHandler(mockMetricsService);
   });

   it('should record metrics for all user domain lifecycle events cleanly without throwing', () => {
      expect(() => {
         handler.handleUserCreated(new UserCreatedEvent('u1', 'acc1', 'johndoe', 'John Doe'));
         handler.handleUserUpdated(new UserUpdatedEvent('u1', 'acc1', { bio: 'hello' }));
         handler.handleUserDeleted(new UserDeletedEvent('u1', 'acc1'));
         handler.handleUserRestored(new UserRestoredEvent('u1', 'acc1'));
         handler.handleUsernameChanged(new UsernameChangedEvent('u1', 'old', 'new'));
         handler.handleUserFollowed(new UserFollowedEvent('f1', 'u1', 'u2', FollowStatus.ACCEPTED));
         handler.handleUserUnfollowed(new UserUnfollowedEvent('u1', 'u2'));
         handler.handleFollowAccepted(new FollowRequestAcceptedEvent('f1', 'u1', 'u2'));
         handler.handleFollowRejected(new FollowRequestRejectedEvent('f1', 'u1', 'u2'));
         handler.handleAvatarUploaded(new AvatarUploadedEvent('u1', 'https://example.com/avatar.png'));
      }).not.toThrow();

      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_CREATED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_UPDATED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_DELETED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_RESTORED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USERNAME_CHANGED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_FOLLOWED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.USER_UNFOLLOWED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.FOLLOW_ACCEPTED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.FOLLOW_REJECTED,
         USER_METRICS_STATUS.SUCCESS,
      );
      expect(mockMetricsService.recordDomainOperation).toHaveBeenCalledWith(
         USER_METRICS_DOMAIN_OPERATIONS.AVATAR_UPLOADED,
         USER_METRICS_STATUS.SUCCESS,
      );
   });
});
