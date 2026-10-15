import { AppLogger } from '@common';
import { USER_METRICS_SEARCH_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { ElasticsearchSearchResult, ISearchAdapter } from '@user/adapters/search/search.adapter.interface';
import type { IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';
import { MetricsSearchAdapterDecorator } from '@user/decorators/metrics-search-adapter.decorator';

describe('MetricsSearchAdapterDecorator', () => {
   let decorator: MetricsSearchAdapterDecorator;
   let mockInner: jest.Mocked<ISearchAdapter>;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;
   let mockLogger: jest.Mocked<AppLogger>;

   beforeEach(() => {
      mockInner = {
         searchUsers: jest.fn(),
         emitIndexEvent: jest.fn(),
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
         startTimer: jest.fn().mockReturnValue(2000),
         calculateDuration: jest.fn().mockReturnValue(0.04),
         reset: jest.fn(),
      };

      mockLogger = {
         setContext: jest.fn(),
         log: jest.fn(),
         error: jest.fn(),
         warn: jest.fn(),
         debug: jest.fn(),
      } as unknown as jest.Mocked<AppLogger>;

      decorator = new MetricsSearchAdapterDecorator(mockInner, mockMetricsService, mockLogger);
   });

   describe('searchUsers', () => {
      it('should record search duration and success metric', async () => {
         const expectedResult: ElasticsearchSearchResult = {
            items: [{ userId: 'u1', username: 'johndoe' }],
            nextCursor: null,
            hasMore: false,
            total: 1,
         };
         mockInner.searchUsers.mockResolvedValue(expectedResult);

         const result = await decorator.searchUsers('john', 10);

         expect(result).toBe(expectedResult);
         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.calculateDuration).toHaveBeenCalledWith(2000);
         expect(mockMetricsService.observeSearchDuration).toHaveBeenCalledWith(0.04);
         expect(mockMetricsService.recordSearchOperation).toHaveBeenCalledWith(
            USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS,
            USER_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure metric, log error and return fallback result when inner fails', async () => {
         const error = new Error('Elasticsearch timeout');
         mockInner.searchUsers.mockRejectedValue(error);

         const result = await decorator.searchUsers('john');

         expect(result).toEqual({ items: [], nextCursor: null, hasMore: false, total: 0 });
         expect(mockMetricsService.recordSearchOperation).toHaveBeenCalledWith(
            USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.error).toHaveBeenCalled();
      });
   });

   describe('emitIndexEvent', () => {
      it('should emit index event and record success metric', () => {
         decorator.emitIndexEvent('user.created', { id: 'u1' });

         expect(mockInner.emitIndexEvent).toHaveBeenCalledWith('user.created', { id: 'u1' });
         expect(mockMetricsService.recordSearchOperation).toHaveBeenCalledWith(
            USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT,
            USER_METRICS_STATUS.SUCCESS,
         );
      });

      it('should catch error, record failure metric and log error when inner throws', () => {
         mockInner.emitIndexEvent.mockImplementation(() => {
            throw new Error('Emit failed');
         });

         expect(() => decorator.emitIndexEvent('user.created', { id: 'u1' })).not.toThrow();
         expect(mockMetricsService.recordSearchOperation).toHaveBeenCalledWith(
            USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT,
            USER_METRICS_STATUS.FAILURE,
         );
         expect(mockLogger.error).toHaveBeenCalled();
      });
   });
});
