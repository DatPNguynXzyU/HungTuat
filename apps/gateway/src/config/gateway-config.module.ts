import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { validateGatewayEnv } from '@/config/gateway-env.schema';
import { GatewayConfigService } from '@/config/gateway-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateGatewayEnv,
         envFilePath: [
            process.env.ENV_FILE || '',
            'apps/gateway/.env.local',
            'apps/gateway/.env',
            '.env.local',
            '.env',
         ].filter(Boolean),
      }),
   ],
   providers: [
      GatewayConfigService,
      {
         provide: CommonConfigService,
         useExisting: GatewayConfigService,
      },
   ],
   exports: [GatewayConfigService, CommonConfigService, ConfigModule],
})
export class GatewayConfigModule {}
