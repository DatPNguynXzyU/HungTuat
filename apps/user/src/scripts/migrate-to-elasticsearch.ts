import { NestFactory } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { AppLogger, SERVICES } from '@common';
import { USER_EVENTS } from '@contracts/user';
import { UserModule } from '@user/user.module';
import { PrismaService } from '@user/core';

async function bootstrap() {
   const app = await NestFactory.createApplicationContext(UserModule);
   const logger = app.get(AppLogger);
   logger.setContext('ElasticsearchUserMigration');

   const prismaService = app.get(PrismaService);
   const searchClient = app.get<ClientProxy>(SERVICES.SEARCH_SERVICE);

   try {
      logger.log('Starting migration to Elasticsearch via RabbitMQ...');

      const users = await prismaService.user.findMany();
      logger.log(`Found ${users.length} users to migrate`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
         try {
            searchClient.emit(USER_EVENTS.SYNC, {
               id: user.userId,
               username: user.username || undefined,
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
            });
            successCount++;
            logger.debug(`Emitted sync event for user: ${user.username}`);
         } catch (error) {
            errorCount++;
            logger.error(
               `Failed to emit sync event for user: ${user.username}`,
               error instanceof Error ? error.stack : undefined,
            );
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
