import { Module } from '@nestjs/common';
import { AppLogger, RmqModule, SERVICES } from '@common';
import { MEDIA_ADAPTER, RabbitMqMediaAdapter } from '@user/adapters/media';
import { SEARCH_ADAPTER, RabbitMqSearchAdapter } from '@user/adapters/search';
import { NOTIFICATION_ADAPTER, RabbitMqNotificationAdapter } from '@user/adapters/notification';
import {
   MetricsMediaAdapterDecorator,
   MetricsNotificationAdapterDecorator,
   MetricsSearchAdapterDecorator,
} from '@user/decorators';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure/user-metrics.interface';
import { UserMetricsService } from '@user/services/infrastructure/user-metrics.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.MEDIA_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
   ],
   providers: [
      // Metrics Service
      UserMetricsService,
      {
         provide: USER_METRICS_SERVICE,
         useExisting: UserMetricsService,
      },

      // Base Adapters
      RabbitMqMediaAdapter,
      RabbitMqSearchAdapter,
      RabbitMqNotificationAdapter,

      // Decorator Pattern Providers
      {
         provide: MEDIA_ADAPTER,
         useFactory: (inner: RabbitMqMediaAdapter, metrics: IUserMetricsService, logger: AppLogger) =>
            new MetricsMediaAdapterDecorator(inner, metrics, logger),
         inject: [RabbitMqMediaAdapter, USER_METRICS_SERVICE, AppLogger],
      },
      {
         provide: SEARCH_ADAPTER,
         useFactory: (inner: RabbitMqSearchAdapter, metrics: IUserMetricsService, logger: AppLogger) =>
            new MetricsSearchAdapterDecorator(inner, metrics, logger),
         inject: [RabbitMqSearchAdapter, USER_METRICS_SERVICE, AppLogger],
      },
      {
         provide: NOTIFICATION_ADAPTER,
         useFactory: (inner: RabbitMqNotificationAdapter, metrics: IUserMetricsService, logger: AppLogger) =>
            new MetricsNotificationAdapterDecorator(inner, metrics, logger),
         inject: [RabbitMqNotificationAdapter, USER_METRICS_SERVICE, AppLogger],
      },
   ],
   exports: [
      USER_METRICS_SERVICE,
      UserMetricsService,
      MEDIA_ADAPTER,
      SEARCH_ADAPTER,
      NOTIFICATION_ADAPTER,
      RabbitMqMediaAdapter,
      RabbitMqSearchAdapter,
      RabbitMqNotificationAdapter,
   ],
})
export class UserAdaptersModule {}
