import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppLogger } from '@common';
import { USER_METRICS_LOG_MESSAGES, USER_METRICS_SEARCH_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { ElasticsearchSearchResult, ISearchAdapter } from '@user/adapters/search/search.adapter.interface';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

/**
 * Decorator Pattern: MetricsSearchAdapterDecorator
 *
 * Transparently wraps ISearchAdapter to record search query durations,
 * indexing event telemetry, and structured logging without polluting Elasticsearch transport logic.
 */
@Injectable()
export class MetricsSearchAdapterDecorator implements ISearchAdapter {
   constructor(
      private readonly inner: ISearchAdapter,
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
      @Optional()
      private readonly logger?: AppLogger,
   ) {
      if (this.logger) {
         this.logger.setContext(MetricsSearchAdapterDecorator.name);
      }
   }

   async searchUsers(query: string, limit = 20, cursor?: string): Promise<ElasticsearchSearchResult> {
      const startTime = this.metricsService.startTimer();
      this.logger?.log({
         message: USER_METRICS_LOG_MESSAGES.DISPATCH_SEARCH_QUERY,
         query,
         limit,
      });

      try {
         const result = await this.inner.searchUsers(query, limit, cursor);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeSearchDuration(duration);
         this.metricsService.recordSearchOperation(
            USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.log({
            message: USER_METRICS_LOG_MESSAGES.SEARCH_QUERY_SUCCESS,
            query,
            totalHits: result.total,
            durationSeconds: duration,
         });

         return result;
      } catch (error) {
         this.metricsService.recordSearchOperation(
            USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.SEARCH_QUERY_FAILED,
            query,
            error: error instanceof Error ? error.message : String(error),
         });

         // Graceful fallback for search failure as a cross-cutting resilience concern
         return { items: [], nextCursor: null, hasMore: false, total: 0 };
      }
   }

   emitIndexEvent(pattern: string, payload: unknown): void {
      try {
         this.inner.emitIndexEvent(pattern, payload);
         this.metricsService.recordSearchOperation(
            USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.debug?.({
            message: USER_METRICS_LOG_MESSAGES.EMIT_INDEX_EVENT,
            pattern,
         });
      } catch (error) {
         this.metricsService.recordSearchOperation(
            USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.EMIT_INDEX_EVENT_FAILED,
            pattern,
            error: error instanceof Error ? error.message : String(error),
         });
      }
   }
}
