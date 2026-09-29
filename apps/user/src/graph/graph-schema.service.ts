import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NebulaService } from '@common';

@Injectable()
export class GraphSchemaService implements OnModuleInit {
   private readonly logger = new Logger(GraphSchemaService.name);

   constructor(private readonly nebulaService: NebulaService) {}

   async onModuleInit() {
      await this.initializeSchema();
   }

   private async initializeSchema(): Promise<void> {
      try {
         this.logger.log('Initializing NebulaGraph schema...');

         // Create space if not exists
         await this.createSpace();

         // Wait for space to be ready
         await this.waitForSpace();

         // Create schema
         await this.createTags();
         await this.createEdges();
         await this.createIndexes();

         this.logger.log('NebulaGraph schema initialized successfully');
      } catch (error) {
         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
         this.logger.error('Failed to initialize NebulaGraph schema', errorMessage);
         throw error;
      }
   }

   private async createSpace(): Promise<void> {
      const queries = [
         `CREATE SPACE IF NOT EXISTS social_graph (
        partition_num = 10,
        replica_factor = 1,
        vid_type = FIXED_STRING(64)
      );`,
      ];

      for (const query of queries) {
         try {
            await this.nebulaService.execute(query);
         } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Space creation query failed (may already exist): ${errorMessage}`);
         }
      }
   }

   private async waitForSpace(): Promise<void> {
      // Wait for space to be ready (NebulaGraph needs time to initialize space)
      this.logger.log('Waiting for space to be ready...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
   }

   private async createTags(): Promise<void> {
      const queries = [
         // User vertex tag
         `USE social_graph;`,
         `CREATE TAG IF NOT EXISTS user (
        user_id string NOT NULL,
        username string,
        display_name string,
        avatar string,
        is_private bool DEFAULT false,
        created_at int64 NOT NULL,
        updated_at int64 NOT NULL
      );`,
      ];

      await this.nebulaService.executeMany(queries);
      this.logger.log('Tags created successfully');
   }

   private async createEdges(): Promise<void> {
      const queries = [
         `USE social_graph;`,
         // Follow edge type
         `CREATE EDGE IF NOT EXISTS follow (
        status string NOT NULL,
        created_at int64 NOT NULL,
        updated_at int64 NOT NULL
      );`,
      ];

      await this.nebulaService.executeMany(queries);
      this.logger.log('Edges created successfully');
   }

   private async createIndexes(): Promise<void> {
      const queries = [
         `USE social_graph;`,
         // Index on user_id for fast lookup
         `CREATE TAG INDEX IF NOT EXISTS user_id_index ON user(user_id(64));`,
         // Index on follow status
         `CREATE EDGE INDEX IF NOT EXISTS follow_status_index ON follow(status(16));`,
      ];

      await this.nebulaService.executeMany(queries);

      // Rebuild indexes
      await this.nebulaService.execute('USE social_graph; REBUILD TAG INDEX user_id_index;');
      await this.nebulaService.execute('USE social_graph; REBUILD EDGE INDEX follow_status_index;');

      this.logger.log('Indexes created and rebuilt successfully');
   }

   async dropSchema(): Promise<void> {
      try {
         await this.nebulaService.execute('DROP SPACE IF EXISTS social_graph;');
         this.logger.log('Schema dropped successfully');
      } catch (error) {
         this.logger.error('Failed to drop schema', error);
         throw error;
      }
   }
}
