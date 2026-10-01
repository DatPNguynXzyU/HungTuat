import { Module, DynamicModule, Global } from '@nestjs/common';
import { ElasticsearchService } from '@common/elasticsearch/elasticsearch.service';
import { ElasticsearchConfig, getElasticsearchConfig } from '@common/elasticsearch/elasticsearch.config';
import { CommonConfigService } from '@common/config/common-config.service';

@Global()
@Module({})
export class ElasticsearchModule {
   static forRoot(config?: Partial<ElasticsearchConfig>): DynamicModule {
      return {
         module: ElasticsearchModule,
         providers: [
            {
               provide: 'ELASTICSEARCH_CONFIG',
               useFactory: (configService: CommonConfigService) => {
                  const esConfig = getElasticsearchConfig(configService);
                  return config ? { ...esConfig, ...config } : esConfig;
               },
               inject: [CommonConfigService],
            },
            {
               provide: ElasticsearchService,
               useFactory: (esConfig: ElasticsearchConfig) => new ElasticsearchService(esConfig),
               inject: ['ELASTICSEARCH_CONFIG'],
            },
         ],
         exports: [ElasticsearchService],
      };
   }
}
