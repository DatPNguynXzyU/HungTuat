import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import createClient, { type Client } from '@nebula-contrib/nebula-nodejs';
import type { NebulaConfig } from '@common/nebula/nebula.config';
import type { NebulaExecutionResponse } from '@common/nebula/nebula.types';

interface NebulaRawResponse {
   error_code: number;
   error_msg?: string | null;
   data?: Record<string, unknown[]> | unknown[];
   space_name?: string;
   latency_in_us?: number;
}

@Injectable()
export class NebulaService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(NebulaService.name);
   private client: Client | null = null;

   constructor(private readonly config: NebulaConfig) {}

   async onModuleInit(): Promise<void> {
      await this.bootstrap();
      this.connect();
   }

   private async bootstrap(): Promise<void> {
      const server = `${this.config.graphAddress}:${this.config.graphPort}`;
      const adminClient = createClient({
         servers: [server],
         userName: 'root',
         password: 'nebula',
         space: '',
         poolSize: 1,
         executeTimeout: 10000,
      });

      adminClient.on('error', () => {
         // Silently suppress bootstrap admin client connection retry logs
      });

      try {
         // 1. Add storage host if not registered
         try {
            await adminClient.execute('ADD HOSTS "nebula-storaged":9779;');
         } catch {
            // Host might already be registered
         }

         // 2. Ensure target space exists
         const spacesRes = (await adminClient.execute('SHOW SPACES;')) as NebulaRawResponse;
         const rows = this.transformToRows(spacesRes.data);
         const hasSpace = rows.some((row) => row.Name === this.config.space);

         if (!hasSpace) {
            this.logger.log(`Creating NebulaGraph space: ${this.config.space}`);
            await adminClient.execute(
               `CREATE SPACE IF NOT EXISTS ${this.config.space}(partition_num=10, replica_factor=1, vid_type=FIXED_STRING(64));`,
            );
            // NebulaGraph requires a short delay for heartbeat sync when a space is newly created
            await new Promise((resolve) => setTimeout(resolve, 3000));
         }

         // 3. Ensure configured user exists with DBA role if not root
         if (this.config.username !== 'root') {
            try {
               await adminClient.execute(
                  `CREATE USER IF NOT EXISTS ${this.config.username} WITH PASSWORD '${this.config.password}';`,
               );
            } catch {
               // User might already exist
            }
            try {
               await adminClient.execute(`GRANT ROLE DBA ON ${this.config.space} TO ${this.config.username};`);
            } catch {
               // Role might already be granted
            }
         }
      } catch (error) {
         this.logger.warn(`NebulaGraph bootstrap notice: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
         try {
            await adminClient.close();
         } catch {
            // Ignore close error
         }
      }
   }

   async onModuleDestroy(): Promise<void> {
      await this.disconnect();
   }

   private connect(): void {
      try {
         this.logger.log('Connecting to NebulaGraph...');

         const server = `${this.config.graphAddress}:${this.config.graphPort}`;

         this.client = createClient({
            servers: [server],
            userName: this.config.username,
            password: this.config.password,
            space: this.config.space,
            poolSize: 10,
            executeTimeout: 15000,
         });

         this.client.on('error', ({ error }: { error?: unknown }) => {
            const rawMsg =
               error instanceof Error
                  ? error.message
                  : typeof error === 'object' && error !== null
                    ? JSON.stringify(error)
                    : String(error);

            // During initial bootstrap before space creation, connection pool retries in background
            if (rawMsg.includes('SpaceNotFound') || rawMsg.includes('Space was not chosen')) {
               this.logger.debug(`NebulaGraph connection pool sync notice: ${rawMsg}`);
               return;
            }

            this.logger.error('NebulaGraph client error', error);
         });

         this.logger.log('Connected to NebulaGraph successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to connect to NebulaGraph', errorMessage);
         throw error;
      }
   }

   private async disconnect(): Promise<void> {
      try {
         if (this.client) {
            await this.client.close();
            this.client = null;
         }
         this.logger.log('Disconnected from NebulaGraph');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Error disconnecting from NebulaGraph', errorMessage);
      }
   }

   private transformToRows(data: Record<string, unknown[]> | unknown[] | null | undefined): Record<string, unknown>[] {
      if (!data) return [];
      if (Array.isArray(data)) return data as Record<string, unknown>[];
      const keys = Object.keys(data);
      if (keys.length === 0) return [];
      const firstCol = data[keys[0]];
      if (!Array.isArray(firstCol)) return [];
      const rowCount = firstCol.length;
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < rowCount; i++) {
         const row: Record<string, unknown> = {};
         for (const key of keys) {
            const col = data[key];
            if (Array.isArray(col)) {
               row[key] = col[i];
            }
         }
         rows.push(row);
      }
      return rows;
   }

   async execute(query: string, options?: { silent?: boolean }): Promise<NebulaExecutionResponse> {
      if (!this.client) {
         throw new Error('NebulaGraph client not initialized');
      }

      try {
         this.logger.debug(`Executing query: ${query}`);
         const result = (await this.client.execute(query)) as NebulaRawResponse;

         if (result.error_code !== 0) {
            throw new Error(`NebulaGraph query failed: ${result.error_msg || `code ${result.error_code}`}`);
         }

         const rows = this.transformToRows(result.data);

         return {
            errorCode: result.error_code,
            errorMessage: result.error_msg || '',
            data: rows,
            spaceName: result.space_name,
            latencyInUs: result.latency_in_us,
         };
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         if (!options?.silent) {
            this.logger.error(`Query execution failed: ${query}`, errorMessage);
         }
         throw error;
      }
   }

   async executeMany(queries: string[], options?: { silent?: boolean }): Promise<NebulaExecutionResponse[]> {
      const results: NebulaExecutionResponse[] = [];

      for (const query of queries) {
         const result = await this.execute(query, options);
         results.push(result);
      }

      return results;
   }

   getClient(): Client {
      if (!this.client) {
         throw new Error('NebulaGraph client not initialized');
      }
      return this.client;
   }
}
