import { NestFactory } from '@nestjs/core';
import { AppLogger } from '@common';
import { UserModule } from '@user/user.module';
import { PrismaService } from '@user/prisma';
import { NebulaService } from '@common';

async function bootstrap() {
   const app = await NestFactory.createApplicationContext(UserModule);
   const logger = app.get(AppLogger);
   logger.setContext('NebulaGraphMigration');

   const prismaService = app.get(PrismaService);
   const nebulaService = app.get(NebulaService);

   try {
      logger.log('Starting migration to NebulaGraph...');

      // Migrate users
      const users = await prismaService.user.findMany();
      logger.log(`Found ${users.length} users to migrate`);

      for (const user of users) {
         const query = `
            INSERT VERTEX User(userId, username, createdAt, updatedAt) 
            VALUES "${user.id}":("${user.id}", "${user.username || ''}", ${user.createdAt.getTime()}, ${user.updatedAt.getTime()});
         `;
         await nebulaService.execute(query);
         logger.debug(`Migrated user: ${user.username}`);
      }

      // Migrate follows
      const follows = await prismaService.follow.findMany();
      logger.log(`Found ${follows.length} follow relationships to migrate`);

      for (const follow of follows) {
         const query = `
            INSERT EDGE Follow(createdAt) VALUES "${follow.followerId}" -> "${follow.followingId}":(${follow.createdAt.getTime()});
         `;
         await nebulaService.execute(query);
         logger.debug(`Migrated follow: ${follow.followerId} -> ${follow.followingId}`);
      }

      logger.log('Migration completed successfully!');
   } catch (error) {
      logger.error('Migration failed', error instanceof Error ? error.stack : undefined);
      throw error;
   } finally {
      await app.close();
   }
}

void bootstrap();
