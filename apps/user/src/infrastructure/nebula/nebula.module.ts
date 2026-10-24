import { Module, DynamicModule, Global } from '@nestjs/common';
import { NebulaService } from '@user/infrastructure/nebula/nebula.service';
import { NebulaConfig, getNebulaConfig } from '@user/infrastructure/nebula/nebula.config';
import { UserConfigService } from '@user/config/user-config.service';
import { NEBULA_CONFIG_TOKEN } from '@user/infrastructure/nebula/nebula.constants';

@Global()
@Module({})
export class NebulaModule {
   static forRoot(config?: Partial<NebulaConfig>): DynamicModule {
      return {
         module: NebulaModule,
         providers: [
            {
               provide: NEBULA_CONFIG_TOKEN,
               useFactory: (configService?: UserConfigService) => {
                  const nebulaConfig = getNebulaConfig(configService);
                  return config ? { ...nebulaConfig, ...config } : nebulaConfig;
               },
               inject: [{ token: UserConfigService, optional: true }],
            },
            {
               provide: NebulaService,
               useFactory: (nebulaConfig: NebulaConfig) => new NebulaService(nebulaConfig),
               inject: [NEBULA_CONFIG_TOKEN],
            },
         ],
         exports: [NebulaService],
      };
   }
}
