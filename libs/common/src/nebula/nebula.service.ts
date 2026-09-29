import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import type { NebulaConfig } from './nebula.config';
import {
   NebulaGraphClient,
   NebulaSessionPool,
   NebulaExecutionResponse,
   NebulaGraphClientConfig,
   NebulaSessionPoolConfig,
} from './nebula.types';

interface NebulaClientModule {
   GraphClient: new (config: NebulaGraphClientConfig) => NebulaGraphClient;
   SessionPool: new (config: NebulaSessionPoolConfig) => NebulaSessionPool;
}

@Injectable()
export class NebulaService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(NebulaService.name);
   private client: NebulaGraphClient | null = null;
   private sessionPool: NebulaSessionPool | null = null;

   private NebulaClientModule: NebulaClientModule | null = null;

   constructor(private readonly config: NebulaConfig) {}

   async onModuleInit(): Promise<void> {
      try {
         const module = await import('@nebula-contrib/nebula-nodejs');
         this.NebulaClientModule = module as unknown as NebulaClientModule;
      } catch (error) {
         this.logger.error('Failed to load nebula-nodejs module', error);
      }
      await this.connect();
   }

   async onModuleDestroy(): Promise<void> {
      await this.disconnect();
   }

   private async connect(): Promise<void> {
      try {
         this.logger.log('Connecting to NebulaGraph...');

         if (!this.NebulaClientModule) {
            throw new Error('NebulaGraph client module not loaded');
         }

         const clientConfig: NebulaGraphClientConfig = {
            address: this.config.graphAddress,
            port: this.config.graphPort,
            username: this.config.username,
            password: this.config.password,
         };

         this.client = new this.NebulaClientModule.GraphClient(clientConfig);

         const poolConfig: NebulaSessionPoolConfig = {
            ...clientConfig,
            spaceName: this.config.space,
            poolSize: 10,
         };

         this.sessionPool = new this.NebulaClientModule.SessionPool(poolConfig);

         await this.sessionPool.init();

         this.logger.log('Connected to NebulaGraph successfully');
      } catch (error) {
         this.logger.error('Failed to connect to NebulaGraph', error);
         throw error;
      }
   }

   private async disconnect(): Promise<void> {
      try {
         if (this.sessionPool) {
            await this.sessionPool.close();
            this.sessionPool = null;
         }

         if (this.client) {
            await this.client.close();
            this.client = null;
         }

         this.logger.log('Disconnected from NebulaGraph');
      } catch (error) {
         this.logger.error('Error disconnecting from NebulaGraph', error);
      }
   }

   async execute(query: string): Promise<NebulaExecutionResponse> {
      if (!this.sessionPool) {
         throw new Error('NebulaGraph session pool not initialized');
      }

      try {
         this.logger.debug(`Executing query: ${query}`);
         const result = await this.sessionPool.execute(query);

         if (result.errorCode !== 0) {
            throw new Error(`NebulaGraph query failed: ${result.errorMessage}`);
         }

         return result;
      } catch (error) {
         this.logger.error(`Query execution failed: ${query}`, error);
         throw error;
      }
   }

   async executeMany(queries: string[]): Promise<NebulaExecutionResponse[]> {
      const results: NebulaExecutionResponse[] = [];

      for (const query of queries) {
         const result = await this.execute(query);
         results.push(result);
      }

      return results;
   }

   getClient(): NebulaGraphClient {
      if (!this.client) {
         throw new Error('NebulaGraph client not initialized');
      }
      return this.client;
   }

   getSessionPool(): NebulaSessionPool {
      if (!this.sessionPool) {
         throw new Error('NebulaGraph session pool not initialized');
      }
      return this.sessionPool;
   }
}
