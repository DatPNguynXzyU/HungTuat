import { Module, DynamicModule, Global } from '@nestjs/common';
import { ElasticsearchService } from '@search/core/elasticsearch/elasticsearch.service';
import { ElasticsearchConfig, getElasticsearchConfig } from '@search/core/elasticsearch/elasticsearch.config';
import { SearchConfigService } from '@search/config/search-config.service';

@Global()
@Module({})
export class ElasticsearchModule {
   static forRoot(config?: Partial<ElasticsearchConfig>): DynamicModule {
      return {
         module: ElasticsearchModule,
         providers: [
            {
               provide: 'ELASTICSEARCH_CONFIG',
               useFactory: (configService: SearchConfigService) => {
                  const esConfig = getElasticsearchConfig(configService);
                  return config ? { ...esConfig, ...config } : esConfig;
               },
               inject: [SearchConfigService],
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
