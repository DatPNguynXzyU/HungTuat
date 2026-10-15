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
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure';

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
      // Base Adapters
      RabbitMqMediaAdapter,
      RabbitMqSearchAdapter,
      RabbitMqNotificationAdapter,

      // Decorators
      MetricsMediaAdapterDecorator,
      MetricsSearchAdapterDecorator,
      MetricsNotificationAdapterDecorator,

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
      MEDIA_ADAPTER,
      SEARCH_ADAPTER,
      NOTIFICATION_ADAPTER,
      RabbitMqMediaAdapter,
      RabbitMqSearchAdapter,
      RabbitMqNotificationAdapter,
      MetricsMediaAdapterDecorator,
      MetricsSearchAdapterDecorator,
      MetricsNotificationAdapterDecorator,
   ],
})
export class UserAdaptersModule {}
