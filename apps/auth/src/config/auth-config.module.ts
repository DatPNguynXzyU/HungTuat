import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateAuthEnv } from '@auth/config/auth-env.schema';
import { AuthConfigService } from '@auth/config/auth-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateAuthEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/auth/.env.local',
            'apps/auth/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      AuthConfigService,
      {
         provide: CommonConfigService,
         useExisting: AuthConfigService,
      },
   ],
   exports: [AuthConfigService, CommonConfigService, ConfigModule],
})
export class AuthConfigModule {}
