import { Module } from '@nestjs/common';
import { RedisModule, RmqModule } from '@common';
import { NotificationConfigModule } from '@notification/config';
import { NotificationController } from '@notification/notification.controller';
import { NotificationLoggerModule } from '@notification/logger';
import { NotificationService } from '@notification/notification.service';
import { PrismaModule } from '@notification/prisma';
import { TranslationService } from '@notification/i18n';
import { EmailTemplateService, ResendService } from '@notification/services';

@Module({
   imports: [NotificationConfigModule, NotificationLoggerModule, RedisModule, RmqModule, PrismaModule],
   controllers: [NotificationController],
   providers: [TranslationService, EmailTemplateService, ResendService, NotificationService],
   exports: [NotificationService, ResendService, EmailTemplateService, TranslationService, PrismaModule],
})
export class NotificationModule {}
