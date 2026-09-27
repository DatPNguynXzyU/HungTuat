import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateNotificationEnv } from '@notification/config/notification-env.schema';
import { NotificationConfigService } from '@notification/config/notification-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateNotificationEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/notification/.env.local',
            'apps/notification/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      NotificationConfigService,
      {
         provide: CommonConfigService,
         useExisting: NotificationConfigService,
      },
   ],
   exports: [NotificationConfigService, CommonConfigService, ConfigModule],
})
export class NotificationConfigModule {}
