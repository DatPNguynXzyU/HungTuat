import { NestFactory } from '@nestjs/core';
import { UserModule } from '@user/user.module';
import { UserRepository } from '@user/repositories';
import { GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService } from '@user/services';
import { FollowRepository } from '@user/repositories';
import { Logger } from '@nestjs/common';

/**
 * Migration script to move existing follow/follower data from PostgreSQL to NebulaGraph
 * Run with: npm run migration:nebula
 */
async function migrate() {
   const logger = new Logger('NebulaGraphMigration');

   try {
      logger.log('Starting migration to NebulaGraph...');

      // Create application context
      const app = await NestFactory.createApplicationContext(UserModule);

      const userRepository = app.get(UserRepository);
      const followRepository = app.get(FollowRepository);
      const graphFollowRepository = app.get(GraphFollowRepository);
      const userGraphSyncService = app.get(UserGraphSyncService);

      // Step 1: Migrate all users
      logger.log('Step 1: Migrating users...');
      const users = await userRepository.findAll();
      logger.log(`Found ${users.length} users to migrate`);

      for (const user of users) {
         await userGraphSyncService.syncUserToGraph(user);
         logger.debug(`Migrated user: ${user.id}`);
      }
      logger.log(`✓ Migrated ${users.length} users`);

      // Step 2: Migrate all follow relationships
      logger.log('Step 2: Migrating follow relationships...');
      const follows = await followRepository.findAllActive();
      logger.log(`Found ${follows.length} follow relationships to migrate`);

      let migratedCount = 0;
      for (const follow of follows) {
         try {
            await graphFollowRepository.createFollow(follow.followerId, follow.followingId, follow.status);
            migratedCount++;

            if (migratedCount % 100 === 0) {
               logger.log(`Migrated ${migratedCount}/${follows.length} relationships...`);
            }
         } catch (error) {
            logger.error(`Failed to migrate follow: ${follow.id}`, error);
         }
      }
      logger.log(`✓ Migrated ${migratedCount}/${follows.length} follow relationships`);

      // Step 3: Verify migration
      logger.log('Step 3: Verifying migration...');
      const sampleUser = users[0];
      if (sampleUser) {
         const pgFollowersCount = await followRepository.countFollowers(sampleUser.id);
         const nebulaFollowersCount = await graphFollowRepository.countFollowers(sampleUser.id);

         logger.log(`Sample verification for user ${sampleUser.id}:`);
         logger.log(`  PostgreSQL followers: ${pgFollowersCount}`);
         logger.log(`  NebulaGraph followers: ${nebulaFollowersCount}`);
      }

      logger.log('✓ Migration completed successfully!');
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
