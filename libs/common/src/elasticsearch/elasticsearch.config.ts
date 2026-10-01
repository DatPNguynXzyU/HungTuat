import { CommonConfigService } from '@common/config/common-config.service';

export interface ElasticsearchConfig {
   node: string;
   username?: string;
   password?: string;
}

export const getElasticsearchConfig = (configService: CommonConfigService): ElasticsearchConfig => {
   return configService.elasticsearch;
};
