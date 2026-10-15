import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppLogger } from '@common';
import type { UserEntity } from '@user/core/database/entities';
import { USER_METRICS_GRAPH_OPERATIONS, USER_METRICS_LOG_MESSAGES, USER_METRICS_STATUS } from '@user/constants';
import type { IUserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.interface';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

/**
 * Decorator Pattern: MetricsUserGraphSyncDecorator
 *
 * Transparently wraps IUserGraphSyncService to track Nebula Graph sync durations,
 * error rates, and operational counters without coupling domain graph handlers to Prometheus.
 */
@Injectable()
export class MetricsUserGraphSyncDecorator implements IUserGraphSyncService {
   constructor(
      private readonly inner: IUserGraphSyncService,
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
      @Optional()
      private readonly logger?: AppLogger,
   ) {
      if (this.logger) {
         this.logger.setContext(MetricsUserGraphSyncDecorator.name);
      }
   }

   async syncUserToGraph(user: UserEntity): Promise<void> {
      const startTime = this.metricsService.startTimer();
      try {
         await this.inner.syncUserToGraph(user);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeGraphSyncDuration(duration);
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_USER,
            USER_METRICS_STATUS.SUCCESS,
         );
      } catch (error) {
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_USER,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.GRAPH_SYNC_USER_FAILED,
            userId: user.userId,
            error: error instanceof Error ? error.message : String(error),
         });
         throw error;
      }
   }

   async syncUsersToGraph(users: UserEntity[]): Promise<void> {
      for (const user of users) {
         await this.syncUserToGraph(user);
      }
   }

   async syncFollowRelationship(followerId: string, followingId: string): Promise<void> {
      const startTime = this.metricsService.startTimer();
      try {
         await this.inner.syncFollowRelationship(followerId, followingId);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeGraphSyncDuration(duration);
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_FOLLOW,
            USER_METRICS_STATUS.SUCCESS,
         );
      } catch (error) {
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_FOLLOW,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.GRAPH_SYNC_FOLLOW_FAILED,
            followerId,
            followingId,
            error: error instanceof Error ? error.message : String(error),
         });
         throw error;
      }
   }

   async syncUnfollowRelationship(followerId: string, followingId: string): Promise<void> {
      const startTime = this.metricsService.startTimer();
      try {
         await this.inner.syncUnfollowRelationship(followerId, followingId);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeGraphSyncDuration(duration);
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_UNFOLLOW,
            USER_METRICS_STATUS.SUCCESS,
         );
      } catch (error) {
         this.metricsService.recordGraphSyncOperation(
            USER_METRICS_GRAPH_OPERATIONS.SYNC_UNFOLLOW,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.GRAPH_SYNC_UNFOLLOW_FAILED,
            followerId,
            followingId,
            error: error instanceof Error ? error.message : String(error),
         });
         throw error;
      }
   }

   processSyncRetries(): Promise<{ processed: number }> {
      return this.inner.processSyncRetries();
   }
}
