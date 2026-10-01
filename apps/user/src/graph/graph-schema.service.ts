import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NebulaService } from '@common';

@Injectable()
export class GraphSchemaService implements OnModuleInit {
   private readonly logger = new Logger(GraphSchemaService.name);
   private readonly spaceName = 'social_graph';

   constructor(private readonly nebulaService: NebulaService) {}

   async onModuleInit(): Promise<void> {
      await this.initializeSchema();
   }

   private async sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
   }

   private extractFirstColumnValue(row: Record<string, unknown>): string {
      const firstVal = Object.values(row)[0];
      if (typeof firstVal === 'string') return firstVal.toLowerCase();
      if (typeof firstVal === 'number' || typeof firstVal === 'boolean') return String(firstVal).toLowerCase();
      return '';
   }

   private async initializeSchema(): Promise<void> {
      try {
         this.logger.log('Starting NebulaGraph enterprise schema initialization...');

         // Ensure storage host registration
         await this.ensureStorageHosts();

         // Ensure Space exists and is fully synchronized across cluster
         await this.ensureSpace();

         // Ensure database roles and users
         await this.ensureUserAndRoles();

         // Ensure Tags and Edges
         await this.ensureTags();
         await this.ensureEdges();

         // Ensure Indexes
         await this.ensureIndexes();

         this.logger.log('NebulaGraph schema initialized successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to initialize NebulaGraph schema', errorMessage);
         throw error;
      }
   }

   private async ensureStorageHosts(): Promise<void> {
      try {
         const hostsResult = await this.nebulaService.execute('SHOW HOSTS;', { silent: true });
         const hasHosts = hostsResult.data && hostsResult.data.length > 0;
         if (!hasHosts) {
            this.logger.log('Registering storage host "nebula-storaged:9779"...');
            await this.nebulaService.execute('ADD HOSTS "nebula-storaged":9779;', { silent: true });
         }
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.debug(`Storage host check notice: ${errorMessage}`);
      }
   }

   private async ensureSpace(): Promise<void> {
      let spaceExists = false;

      try {
         const spacesResult = await this.nebulaService.execute('SHOW SPACES;', { silent: true });
         const existingSpaces = (spacesResult.data || []).map((row) => this.extractFirstColumnValue(row));
         spaceExists = existingSpaces.includes(this.spaceName.toLowerCase());
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.debug(`Could not inspect spaces, attempting creation: ${errorMessage}`);
      }

      if (!spaceExists) {
         this.logger.log(`Space "${this.spaceName}" not found. Creating space...`);
         await this.nebulaService.execute(
            `CREATE SPACE IF NOT EXISTS ${this.spaceName} (
               partition_num = 10,
               replica_factor = 1,
               vid_type = FIXED_STRING(64)
            );`,
         );

         this.logger.log(`Waiting for space "${this.spaceName}" to synchronize across cluster...`);
         const maxRetries = 15;
         let isSynchronized = false;

         for (let attempt = 1; attempt <= maxRetries; attempt++) {
            await this.sleep(2000);
            try {
               const check = await this.nebulaService.execute(`USE ${this.spaceName}; SHOW TAGS;`, { silent: true });
               if (check.errorCode === 0) {
                  isSynchronized = true;
                  break;
               }
            } catch {
               this.logger.debug(
                  `Waiting for space "${this.spaceName}" metadata sync (attempt ${attempt}/${maxRetries})...`,
               );
            }
         }

         if (!isSynchronized) {
            throw new Error(`Timed out waiting for NebulaGraph space "${this.spaceName}" to synchronize`);
         }

         this.logger.log(`Space "${this.spaceName}" is synchronized and ready.`);
      } else {
         this.logger.log(`Space "${this.spaceName}" already exists and ready.`);
      }
   }

   private async ensureUserAndRoles(): Promise<void> {
      const queries = [
         `CREATE USER IF NOT EXISTS zeion WITH PASSWORD '582005';`,
         `GRANT ROLE ADMIN ON ${this.spaceName} TO zeion;`,
      ];

      for (const query of queries) {
         try {
            await this.nebulaService.execute(query, { silent: true });
         } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.debug(`User setup notice: ${errorMessage}`);
         }
      }
   }

   private async ensureTags(): Promise<void> {
      try {
         const result = await this.nebulaService.execute(`USE ${this.spaceName}; SHOW TAGS;`, { silent: true });
         const existingTags = (result.data || []).map((row) => this.extractFirstColumnValue(row));

         if (!existingTags.includes('user')) {
            this.logger.log('Creating tag "user"...');
            await this.nebulaService.execute(`
               USE ${this.spaceName};
               CREATE TAG IF NOT EXISTS user (
                  user_id string NOT NULL,
                  username string,
                  display_name string,
                  avatar string,
                  is_private bool DEFAULT false,
                  created_at int64 NOT NULL,
                  updated_at int64 NOT NULL
               );
            `);
         }
         this.logger.log('Tags verified successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to ensure tags', errorMessage);
         throw error;
      }
   }

   private async ensureEdges(): Promise<void> {
      try {
         const result = await this.nebulaService.execute(`USE ${this.spaceName}; SHOW EDGES;`, { silent: true });
         const existingEdges = (result.data || []).map((row) => this.extractFirstColumnValue(row));

         if (!existingEdges.includes('follow')) {
            this.logger.log('Creating edge "follow"...');
            await this.nebulaService.execute(`
               USE ${this.spaceName};
               CREATE EDGE IF NOT EXISTS follow (
                  status string NOT NULL,
                  created_at int64 NOT NULL,
                  updated_at int64 NOT NULL
               );
            `);
         }
         this.logger.log('Edges verified successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to ensure edges', errorMessage);
         throw error;
      }
   }

   private async ensureIndexes(): Promise<void> {
      try {
         const tagIndexResult = await this.nebulaService.execute(`USE ${this.spaceName}; SHOW TAG INDEXES;`, {
            silent: true,
         });
         const existingTagIndexes = (tagIndexResult.data || []).map((row) => this.extractFirstColumnValue(row));

         if (!existingTagIndexes.includes('user_id_index')) {
            this.logger.log('Creating tag index "user_id_index"...');
            await this.nebulaService.execute(`
               USE ${this.spaceName};
               CREATE TAG INDEX IF NOT EXISTS user_id_index ON user(user_id(64));
            `);
         }

         const edgeIndexResult = await this.nebulaService.execute(`USE ${this.spaceName}; SHOW EDGE INDEXES;`, {
            silent: true,
         });
         const existingEdgeIndexes = (edgeIndexResult.data || []).map((row) => this.extractFirstColumnValue(row));

         if (!existingEdgeIndexes.includes('follow_status_index')) {
            this.logger.log('Creating edge index "follow_status_index"...');
            await this.nebulaService.execute(`
               USE ${this.spaceName};
               CREATE EDGE INDEX IF NOT EXISTS follow_status_index ON follow(status(16));
            `);
         }

         this.logger.log('Indexes verified successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to ensure indexes', errorMessage);
         throw error;
      }
   }

   async dropSchema(): Promise<void> {
      try {
         await this.nebulaService.execute(`DROP SPACE IF EXISTS ${this.spaceName};`);
         this.logger.log(`Schema "${this.spaceName}" dropped successfully`);
      } catch (error) {
         this.logger.error('Failed to drop schema', error);
         throw error;
      }
   }
}
