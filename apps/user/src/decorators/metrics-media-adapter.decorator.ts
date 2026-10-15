import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppLogger } from '@common';
import type { MediaResponseDto, UploadUrlResponseDto } from '@contracts/media';
import { USER_METRICS_LOG_MESSAGES, USER_METRICS_MEDIA_OPERATIONS, USER_METRICS_STATUS } from '@user/constants';
import type { IMediaAdapter, UploadAvatarParams } from '@user/adapters/media/media.adapter.interface';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';

/**
 * Decorator Pattern: MetricsMediaAdapterDecorator
 *
 * Transparently wraps IMediaAdapter to record Prometheus latency histograms,
 * operation counters, and structured logging without polluting RabbitMQ transport code.
 */
@Injectable()
export class MetricsMediaAdapterDecorator implements IMediaAdapter {
   constructor(
      private readonly inner: IMediaAdapter,
      @Inject(USER_METRICS_SERVICE)
      private readonly metricsService: IUserMetricsService,
      @Optional()
      private readonly logger?: AppLogger,
   ) {
      if (this.logger) {
         this.logger.setContext(MetricsMediaAdapterDecorator.name);
      }
   }

   async uploadAvatar(params: UploadAvatarParams): Promise<MediaResponseDto> {
      const startTime = this.metricsService.startTimer();
      this.logger?.log({
         message: USER_METRICS_LOG_MESSAGES.DISPATCH_AVATAR_UPLOAD,
         userId: params.userId,
      });

      try {
         const result = await this.inner.uploadAvatar(params);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeMediaDuration(duration);
         this.metricsService.recordMediaOperation(
            USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.log({
            message: USER_METRICS_LOG_MESSAGES.AVATAR_UPLOAD_SUCCESS,
            userId: params.userId,
            durationSeconds: duration,
         });

         return result;
      } catch (error) {
         this.metricsService.recordMediaOperation(
            USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.AVATAR_UPLOAD_FAILED,
            userId: params.userId,
            error: error instanceof Error ? error.message : String(error),
         });
         throw error;
      }
   }

   async getAvatarUploadSignature(userId: string): Promise<UploadUrlResponseDto> {
      const startTime = this.metricsService.startTimer();
      this.logger?.log({
         message: USER_METRICS_LOG_MESSAGES.REQUEST_AVATAR_SIGNATURE,
         userId,
      });

      try {
         const result = await this.inner.getAvatarUploadSignature(userId);
         const duration = this.metricsService.calculateDuration(startTime);

         this.metricsService.observeMediaDuration(duration);
         this.metricsService.recordMediaOperation(
            USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE,
            USER_METRICS_STATUS.SUCCESS,
         );
         this.logger?.log({
            message: USER_METRICS_LOG_MESSAGES.AVATAR_SIGNATURE_SUCCESS,
            userId,
            durationSeconds: duration,
         });

         return result;
      } catch (error) {
         this.metricsService.recordMediaOperation(
            USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE,
            USER_METRICS_STATUS.FAILURE,
         );
         this.logger?.error({
            message: USER_METRICS_LOG_MESSAGES.AVATAR_SIGNATURE_FAILED,
            userId,
            error: error instanceof Error ? error.message : String(error),
         });
         throw error;
      }
   }
}
