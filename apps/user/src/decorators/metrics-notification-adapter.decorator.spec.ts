import { AppLogger } from '@common';
import { FollowStatus } from '@user/core/database/entities';
import { USER_METRICS_NOTIFICATION_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { INotificationAdapter } from '@user/adapters/notification/notification.adapter.interface';
import type { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';
import { MetricsNotificationAdapterDecorator } from '@user/decorators/metrics-notification-adapter.decorator';

describe('MetricsNotificationAdapterDecorator', () => {
   let decorator: MetricsNotificationAdapterDecorator;
   let mockInner: jest.Mocked<INotificationAdapter>;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;
   let mockLogger: jest.Mocked<AppLogger>;

   beforeEach(() => {
      mockInner = {
         sendUserFollowedNotification: jest.fn(),
         sendFollowAcceptedNotification: jest.fn(),
      };

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
         startTimer: jest.fn().mockReturnValue(1234),
         calculateDuration: jest.fn().mockReturnValue(0.01),
         reset: jest.fn(),
      };

      mockLogger = {
         setContext: jest.fn(),
         log: jest.fn(),
         error: jest.fn(),
         warn: jest.fn(),
         debug: jest.fn(),
      } as unknown as jest.Mocked<AppLogger>;

      decorator = new MetricsNotificationAdapterDecorator(mockInner, mockMetricsService, mockLogger);
   });

   describe('sendUserFollowedNotification', () => {
      it('should record success metric on successful dispatch', async () => {
         mockInner.sendUserFollowedNotification.mockResolvedValue();

         await decorator.sendUserFollowedNotification({
            recipientId: 'u2',
            followerId: 'u1',
            followId: 'f1',
            status: FollowStatus.ACCEPTED,
            createdAt: new Date(),
         });

         expect(mockMetricsService.recordNotificationOperation).toHaveBeenCalledWith(
            USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.SUCCESS,
         );
         expect(mockLogger.log).toHaveBeenCalled();
      });

      it('should record failure metric and log warning on error', async () => {
         mockInner.sendUserFollowedNotification.mockRejectedValue(new Error('Broker unreachable'));

         await decorator.sendUserFollowedNotification({
            recipientId: 'u2',
            followerId: 'u1',
            followId: 'f1',
            status: FollowStatus.ACCEPTED,
            createdAt: new Date(),
         });

         expect(mockMetricsService.recordNotificationOperation).toHaveBeenCalledWith(
            USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.warn).toHaveBeenCalled();
      });
   });

   describe('sendFollowAcceptedNotification', () => {
      it('should record success metric on accepted dispatch', async () => {
         mockInner.sendFollowAcceptedNotification.mockResolvedValue();

         await decorator.sendFollowAcceptedNotification({
            recipientId: 'u1',
            acceptedBy: 'u2',
            followId: 'f1',
            acceptedAt: new Date(),
         });

         expect(mockMetricsService.recordNotificationOperation).toHaveBeenCalledWith(
            USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.SUCCESS,
         );
         expect(mockLogger.log).toHaveBeenCalled();
      });

      it('should record failure metric and log warning on error', async () => {
         mockInner.sendFollowAcceptedNotification.mockRejectedValue(new Error('Broker error'));

         await decorator.sendFollowAcceptedNotification({
            recipientId: 'u1',
            acceptedBy: 'u2',
            followId: 'f1',
            acceptedAt: new Date(),
         });

         expect(mockMetricsService.recordNotificationOperation).toHaveBeenCalledWith(
            USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.warn).toHaveBeenCalled();
      });
   });
});
