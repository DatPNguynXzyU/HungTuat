import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { UserRepository } from '@user/repositories';
import { UserSearchService } from '@user/search';

async function migrate() {
   const logger = new Logger('ElasticsearchUserMigration');

   try {
      logger.log('Starting migration to Elasticsearch...');

      const app = await NestFactory.createApplicationContext(UserModule);
      const userRepository = app.get(UserRepository);
      const userSearchService = app.get(UserSearchService);

      logger.log('Fetching users from PostgreSQL...');
      const users = await userRepository.findAll(0, 10000);
      logger.log(`Found ${users.length} users to index into Elasticsearch`);

      let indexedCount = 0;
      for (const user of users) {
         try {
            await userSearchService.indexUser(user);
            indexedCount++;
            if (indexedCount % 50 === 0) {
               logger.log(`Indexed ${indexedCount}/${users.length} users...`);
            }
         } catch (error) {
            logger.error(`Failed to index user ${user.id}:`, error);
         }
      }

      logger.log(`✓ Successfully indexed ${indexedCount}/${users.length} users into Elasticsearch!`);
      await app.close();
   } catch (error) {
      logger.error('Migration failed:', error);
      process.exit(1);
   }
}

migrate().catch((error) => {
   console.error('Fatal error during migration:', error);
   process.exit(1);
});
