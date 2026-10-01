import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import type { ElasticsearchConfig } from '@common/elasticsearch/elasticsearch.config';

@Injectable()
export class ElasticsearchService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(ElasticsearchService.name);
   private readonly client: Client;

   constructor(private readonly config: ElasticsearchConfig) {
      this.client = new Client({
         node: this.config.node,
         auth:
            this.config.username && this.config.password
               ? {
                    username: this.config.username,
                    password: this.config.password,
                 }
               : undefined,
      });
   }

   async onModuleInit(): Promise<void> {
      try {
         const ping = await this.client.ping();
         if (ping) {
            this.logger.log(`Connected to Elasticsearch at ${this.config.node}`);
         }
      } catch (error) {
         this.logger.warn(`Failed to connect to Elasticsearch at ${this.config.node}: ${(error as Error).message}`);
      }
   }

   async onModuleDestroy(): Promise<void> {
      try {
         await this.client.close();
      } catch (error) {
         this.logger.error(`Error closing Elasticsearch client: ${(error as Error).message}`);
      }
   }

   getClient(): Client {
      return this.client;
   }
}
