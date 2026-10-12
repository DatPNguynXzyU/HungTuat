import { NestFactory } from '@nestjs/core';
import { AppLogger } from '@common';
import { UserModule } from '@user/user.module';
import { PrismaService } from '@user/prisma';
import { UserSearchService } from '@user/search';

async function bootstrap() {
   const app = await NestFactory.createApplicationContext(UserModule);
   const logger = app.get(AppLogger);
   logger.setContext('ElasticsearchUserMigration');

   const prismaService = app.get(PrismaService);
   const userSearchService = app.get(UserSearchService);

   try {
      logger.log('Starting migration to Elasticsearch...');

      const users = await prismaService.user.findMany();
      logger.log(`Found ${users.length} users to migrate`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
         try {
            await userSearchService.indexUser({
               id: user.userId,
               username: user.username || undefined,
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
            });
            successCount++;
            logger.debug(`Indexed user: ${user.username}`);
         } catch (error) {
            errorCount++;
            logger.error(`Failed to index user: ${user.username}`, error instanceof Error ? error.stack : undefined);
         }
      }

      logger.log(`Migration completed! Success: ${successCount}, Errors: ${errorCount}`);
   } catch (error) {
      logger.error('Migration failed', error instanceof Error ? error.stack : undefined);
      throw error;
   } finally {
      await app.close();
   }
}

void bootstrap();
