import { Injectable, OnModuleInit } from '@nestjs/common';
import { NebulaService } from '@common';
import { AppLogger } from '@common';

@Injectable()
export class GraphSchemaService implements OnModuleInit {
   constructor(
      private readonly nebulaService: NebulaService,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(GraphSchemaService.name);
   }

   async onModuleInit() {
      await this.createSchema();
   }

   private async createSchema(): Promise<void> {
      try {
         this.logger.log('Creating NebulaGraph schema for User service');

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
      } catch (error) {
         this.logger.error('Failed to create NebulaGraph schema', error instanceof Error ? error.stack : undefined);
      }
   }
}
