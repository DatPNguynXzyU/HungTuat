import { Module, DynamicModule, Global } from '@nestjs/common';
import { NebulaService } from './nebula.service';
import { NebulaConfig, getNebulaConfig } from './nebula.config';
import { CommonConfigService } from '@common/config/common-config.service';

@Global()
@Module({})
export class NebulaModule {
   static forRoot(config?: Partial<NebulaConfig>): DynamicModule {
      return {
         module: NebulaModule,
         providers: [
            {
               provide: 'NEBULA_CONFIG',
               useFactory: (configService: CommonConfigService) => {
                  const nebulaConfig = getNebulaConfig(configService);
                  return config ? { ...nebulaConfig, ...config } : nebulaConfig;
               },
               inject: [CommonConfigService],
            },
            {
               provide: NebulaService,
               useFactory: (nebulaConfig: NebulaConfig) => new NebulaService(nebulaConfig),
               inject: ['NEBULA_CONFIG'],
            },
         ],
         exports: [NebulaService],
      };
   }
}
