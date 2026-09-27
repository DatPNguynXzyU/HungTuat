import { Module } from '@nestjs/common';
import { LoggerModule, RedisModule, RmqModule } from '@common';
import { NotificationConfigModule } from '@notification/config';
import { NotificationController } from '@notification/notification.controller';
import { NotificationService } from '@notification/notification.service';
import { EmailTemplateService, ResendService } from '@notification/services';

@Module({
   imports: [NotificationConfigModule, LoggerModule, RedisModule, RmqModule],
   controllers: [NotificationController],
   providers: [EmailTemplateService, ResendService, NotificationService],
   exports: [NotificationService, ResendService, EmailTemplateService],
})
export class NotificationModule {}
