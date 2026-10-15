import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_PATTERNS } from '@contracts/notification';
import { USER_METRICS_LOG_MESSAGES } from '@user/constants';
import type {
   FollowAcceptedNotificationData,
   INotificationAdapter,
   UserFollowedNotificationData,
} from '@user/adapters/notification/notification.adapter.interface';

@Injectable()
export class RabbitMqNotificationAdapter implements INotificationAdapter {
   private readonly logger = new Logger(RabbitMqNotificationAdapter.name);

   constructor(
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
   ) {}

   async sendUserFollowedNotification(data: UserFollowedNotificationData): Promise<void> {
      try {
         await firstValueFrom(this.notificationClient.emit(NOTIFICATION_PATTERNS.USER_FOLLOWED, data));
      } catch (err) {
         this.logger.warn(
            `${USER_METRICS_LOG_MESSAGES.DISPATCH_FOLLOW_NOTIFICATION_FAILED} [${data.followId}]: ${String(err)}`,
         );
      }
   }

   async sendFollowAcceptedNotification(data: FollowAcceptedNotificationData): Promise<void> {
      try {
         await firstValueFrom(this.notificationClient.emit(NOTIFICATION_PATTERNS.FOLLOW_ACCEPTED, data));
      } catch (err) {
         this.logger.warn(
            `${USER_METRICS_LOG_MESSAGES.DISPATCH_ACCEPT_NOTIFICATION_FAILED} [${data.followId}]: ${String(err)}`,
         );
      }
   }
}
