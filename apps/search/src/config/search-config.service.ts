import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService, ENV_KEYS } from '@common';
import { SearchEnvConfig } from '@search/config/search-env.schema';

@Injectable()
export class SearchConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<SearchEnvConfig, true>) {
      super(configService);
   }

   get elasticsearchNode(): string {
      return this.configService.get(ENV_KEYS.ELASTICSEARCH_NODE, { infer: true }) || 'http://localhost:9200';
   }

   get elasticsearchUsername(): string | undefined {
      return this.configService.get(ENV_KEYS.ELASTICSEARCH_USERNAME, { infer: true });
   }

   get elasticsearchPassword(): string | undefined {
      return this.configService.get(ENV_KEYS.ELASTICSEARCH_PASSWORD, { infer: true });
   }

   get httpPort(): number {
      return this.configService.get('SEARCH_HTTP_PORT', { infer: true }) || 3003;
   }
}
