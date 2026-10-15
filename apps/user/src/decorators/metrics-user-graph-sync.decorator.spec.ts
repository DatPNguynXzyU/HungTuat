import { AppLogger } from '@common';
import { UserEntity } from '@user/core/database/entities';
import { USER_METRICS_GRAPH_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { IUserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.interface';
import type { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';
import { MetricsUserGraphSyncDecorator } from '@user/decorators/metrics-user-graph-sync.decorator';

describe('MetricsUserGraphSyncDecorator', () => {
   let decorator: MetricsUserGraphSyncDecorator;
   let mockInner: jest.Mocked<IUserGraphSyncService>;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;
   let mockLogger: jest.Mocked<AppLogger>;

   beforeEach(() => {
      mockInner = {
         syncUserToGraph: jest.fn(),
         syncUsersToGraph: jest.fn(),
         syncFollowRelationship: jest.fn(),
         syncUnfollowRelationship: jest.fn(),
         processSyncRetries: jest.fn(),
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
         startTimer: jest.fn().mockReturnValue(3000),
         calculateDuration: jest.fn().mockReturnValue(0.05),
         reset: jest.fn(),
      };

      mockLogger = {
         setContext: jest.fn(),
         log: jest.fn(),
         error: jest.fn(),
         warn: jest.fn(),
         debug: jest.fn(),
      } as unknown as jest.Mocked<AppLogger>;

      decorator = new MetricsUserGraphSyncDecorator(mockInner, mockMetricsService, mockLogger);
   });

   describe('syncUserToGraph', () => {
      it('should measure duration and record success metric', async () => {
         mockInner.syncUserToGraph.mockResolvedValue();
         const user = new UserEntity({ userId: 'u1', username: 'john' });

         await decorator.syncUserToGraph(user);

         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.calculateDuration).toHaveBeenCalledWith(3000);
         expect(mockMetricsService.observeGraphSyncDuration).toHaveBeenCalledWith(0.05);
         expect(mockMetricsService.recordGraphSyncOperation).toHaveBeenCalledWith(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_USER,
            USER_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure metric and rethrow error', async () => {
         const error = new Error('Graph unavailable');
         mockInner.syncUserToGraph.mockRejectedValue(error);
         const user = new UserEntity({ userId: 'u1' });

         await expect(decorator.syncUserToGraph(user)).rejects.toThrow(error);

         expect(mockMetricsService.recordGraphSyncOperation).toHaveBeenCalledWith(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_USER,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.error).toHaveBeenCalled();
      });
   });

   describe('syncFollowRelationship', () => {
      it('should record follow sync metrics', async () => {
         mockInner.syncFollowRelationship.mockResolvedValue();

         await decorator.syncFollowRelationship('u1', 'u2');

         expect(mockMetricsService.recordGraphSyncOperation).toHaveBeenCalledWith(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_FOLLOW,
            USER_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure metric on follow sync failure', async () => {
         mockInner.syncFollowRelationship.mockRejectedValue(new Error('Edge creation failed'));

         await expect(decorator.syncFollowRelationship('u1', 'u2')).rejects.toThrow();

         expect(mockMetricsService.recordGraphSyncOperation).toHaveBeenCalledWith(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_FOLLOW,
            USER_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('syncUnfollowRelationship', () => {
      it('should record unfollow sync metrics', async () => {
         mockInner.syncUnfollowRelationship.mockResolvedValue();

         await decorator.syncUnfollowRelationship('u1', 'u2');

         expect(mockMetricsService.recordGraphSyncOperation).toHaveBeenCalledWith(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_UNFOLLOW,
            USER_METRICS_STATUS.SUCCESS,
         );
      });
   });

   describe('processSyncRetries', () => {
      it('should delegate processSyncRetries to inner', async () => {
         mockInner.processSyncRetries.mockResolvedValue({ processed: 5 });

         const result = await decorator.processSyncRetries();

         expect(result).toEqual({ processed: 5 });
         expect(mockInner.processSyncRetries).toHaveBeenCalled();
      });
   });
});
