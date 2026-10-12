import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateSearchEnv } from '@search/config/search-env.schema';
import { SearchConfigService } from '@search/config/search-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateSearchEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/search/.env.local',
            'apps/search/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      SearchConfigService,
      {
         provide: CommonConfigService,
         useExisting: SearchConfigService,
      },
   ],
   exports: [SearchConfigService, CommonConfigService, ConfigModule],
})
export class SearchConfigModule {}
