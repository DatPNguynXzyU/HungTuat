import { Module, DynamicModule, Global } from '@nestjs/common';
import { NebulaService } from '@common/nebula/nebula.service';
import { NebulaConfig, getNebulaConfig } from '@common/nebula/nebula.config';
import { CommonConfigService } from '@common/config/common-config.service';
import { NEBULA_CONFIG_TOKEN } from '@common/nebula/nebula.constants';

@Global()
@Module({})
export class NebulaModule {
   static forRoot(config?: Partial<NebulaConfig>): DynamicModule {
      return {
         module: NebulaModule,
         providers: [
            {
               provide: NEBULA_CONFIG_TOKEN,
               useFactory: (configService?: CommonConfigService) => {
                  const nebulaConfig = getNebulaConfig(configService as unknown as { nebula?: Partial<NebulaConfig> });
                  return config ? { ...nebulaConfig, ...config } : nebulaConfig;
               },
               inject: [{ token: CommonConfigService, optional: true }],
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
