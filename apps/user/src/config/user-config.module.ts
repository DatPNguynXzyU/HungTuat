import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateUserEnv } from '@user/config/user-env.schema';
import { UserConfigService } from '@user/config/user-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateUserEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/user/.env.local',
            'apps/user/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      UserConfigService,
      {
         provide: CommonConfigService,
         useExisting: UserConfigService,
      },
   ],
   exports: [UserConfigService, CommonConfigService, ConfigModule],
})
export class UserConfigModule {}
