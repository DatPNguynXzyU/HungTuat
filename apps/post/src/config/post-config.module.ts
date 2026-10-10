import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validatePostEnv } from '@post/config/post-env.schema';
import { PostConfigService } from '@post/config/post-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validatePostEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/post/.env.local',
            'apps/post/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      PostConfigService,
      {
         provide: CommonConfigService,
         useExisting: PostConfigService,
      },
   ],
   exports: [PostConfigService, CommonConfigService, ConfigModule],
})
export class PostConfigModule {}
