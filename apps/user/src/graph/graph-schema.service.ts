import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AppLogger } from '@common';
import { NebulaService } from '@user/infrastructure/nebula';

@Injectable()
export class GraphSchemaService implements OnApplicationBootstrap {
   constructor(
      private readonly nebulaService: NebulaService,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(GraphSchemaService.name);
   }

   async onApplicationBootstrap(): Promise<void> {
      await this.createSchema();
   }

   private async createSchema(): Promise<void> {
      const maxRetries = 5;
      const retryDelayMs = 2000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
         try {
            this.logger.log(`Creating NebulaGraph schema for User service (attempt ${attempt}/${maxRetries})`);

            // Ensure space is selected
            await this.nebulaService.execute('USE social_graph;');

            // Create User tag matching social_graph schema
            await this.nebulaService.execute(`
               CREATE TAG IF NOT EXISTS User (
                  user_id string,
                  username string,
                  display_name string,
                  avatar string,
                  is_private bool,
                  created_at int64,
                  updated_at int64
               );
            `);

            // Create Follow edge
            await this.nebulaService.execute(`
               CREATE EDGE IF NOT EXISTS Follow (
                  createdAt timestamp
               );
            `);

            // Create indexes
            try {
               await this.nebulaService.execute(`
                  CREATE TAG INDEX IF NOT EXISTS user_id_index ON User(user_id(64));
               `);
            } catch {
               // Index might already exist
            }

            try {
               await this.nebulaService.execute(`
                  CREATE TAG INDEX IF NOT EXISTS username_index ON User(username(64));
               `);
            } catch {
               // Index might already exist
            }

            this.logger.log('NebulaGraph schema created successfully');
            return;
         } catch (error) {
            this.logger.warn(
               `Failed to create NebulaGraph schema on attempt ${attempt}/${maxRetries}: ${error instanceof Error ? error.message : String(error)}`,
            );
            if (attempt === maxRetries) {
               this.logger.error(
                  'Exhausted all retries creating NebulaGraph schema',
                  error instanceof Error ? error.stack : undefined,
               );
            } else {
               await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            }
         }
      }
   }
}
