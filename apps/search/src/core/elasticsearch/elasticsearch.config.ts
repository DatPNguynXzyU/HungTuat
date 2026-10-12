import { SearchConfigService } from '@search/config/search-config.service';

export interface ElasticsearchConfig {
   node: string;
   username?: string;
   password?: string;
}

export const getElasticsearchConfig = (configService: SearchConfigService): ElasticsearchConfig => {
   return {
      node: configService.elasticsearchNode,
      username: configService.elasticsearchUsername,
      password: configService.elasticsearchPassword,
   };
};
