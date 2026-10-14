import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateMediaEnv } from '@media/config/media-env.schema';
import { MediaConfigService } from '@media/config/media-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateMediaEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/media/.env.local',
            'apps/media/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      MediaConfigService,
      {
         provide: CommonConfigService,
         useExisting: MediaConfigService,
      },
   ],
   exports: [MediaConfigService, CommonConfigService, ConfigModule],
})
export class MediaConfigModule {}
