import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppLogger } from '@common';
import { USER_METRICS_LOG_MESSAGES, USER_METRICS_NOTIFICATION_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type {
   FollowAcceptedNotificationData,
   INotificationAdapter,
   UserFollowedNotificationData,
} from '@user/adapters/notification/notification.adapter.interface';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

/**
 * Decorator Pattern: MetricsNotificationAdapterDecorator
 *
 * Transparently wraps INotificationAdapter to track notification dispatch metrics
 * and structured logs without contaminating RabbitMQ message emission logic.
 */
@Injectable()
export class MetricsNotificationAdapterDecorator implements INotificationAdapter {
   constructor(
      private readonly inner: INotificationAdapter,
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
      @Optional()
      private readonly logger?: AppLogger,
   ) {
      if (this.logger) {
         this.logger.setContext(MetricsNotificationAdapterDecorator.name);
      }
   }

   async sendUserFollowedNotification(data: UserFollowedNotificationData): Promise<void> {
      try {
         await this.inner.sendUserFollowedNotification(data);
         this.metricsService.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.log({
            message: USER_METRICS_LOG_MESSAGES.DISPATCH_FOLLOW_NOTIFICATION,
            followId: data.followId,
            recipientId: data.recipientId,
         });
      } catch (error) {
         this.metricsService.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.warn({
            message: USER_METRICS_LOG_MESSAGES.DISPATCH_FOLLOW_NOTIFICATION_FAILED,
            followId: data.followId,
            error: error instanceof Error ? error.message : String(error),
         });
      }
   }

   async sendFollowAcceptedNotification(data: FollowAcceptedNotificationData): Promise<void> {
      try {
         await this.inner.sendFollowAcceptedNotification(data);
         this.metricsService.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.log({
            message: USER_METRICS_LOG_MESSAGES.DISPATCH_ACCEPT_NOTIFICATION,
            followId: data.followId,
            recipientId: data.recipientId,
         });
      } catch (error) {
         this.metricsService.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.warn({
            message: USER_METRICS_LOG_MESSAGES.DISPATCH_ACCEPT_NOTIFICATION_FAILED,
            followId: data.followId,
            error: error instanceof Error ? error.message : String(error),
         });
      }
   }
}
