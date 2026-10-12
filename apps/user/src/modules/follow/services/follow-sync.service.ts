import { Injectable } from '@nestjs/common';
import { AppLogger } from '@common';
import { UserEntity } from '@user/core/database/entities';
import { FollowGraphRepository } from '@user/modules/follow/repositories/follow-graph.repository';

@Injectable()
export class FollowSyncService {
   private readonly logger: AppLogger;

   constructor(
      private readonly graphFollowRepository: FollowGraphRepository,
      logger: AppLogger,
   ) {
      this.logger = logger;
      this.logger.setContext(FollowSyncService.name);
   }

   async syncUserToGraph(user: UserEntity): Promise<void> {
      try {
         this.logger.log(`Syncing user to graph: ${user.id} (${user.username ?? user.accountId})`);
         await this.graphFollowRepository.createOrUpdateUser({
            id: user.id,
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            bio: user.bio,
            isPrivate: user.isPrivate,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         });
      } catch (error) {
         this.logger.error(
            `Failed to sync user to graph: ${user.id}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async syncUsersToGraph(users: UserEntity[]): Promise<void> {
      for (const user of users) {
         await this.syncUserToGraph(user);
      }
   }

   async syncFollowRelationship(followerId: string, followingId: string): Promise<void> {
      try {
         this.logger.log(`Syncing follow relationship: ${followerId} -> ${followingId}`);
         await this.graphFollowRepository.createFollow(followerId, followingId);
      } catch (error) {
         this.logger.error(
            `Failed to sync follow relationship: ${followerId} -> ${followingId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async syncUnfollowRelationship(followerId: string, followingId: string): Promise<void> {
      try {
         this.logger.log(`Syncing unfollow relationship: ${followerId} -> ${followingId}`);
         await this.graphFollowRepository.deleteFollow(followerId, followingId);
      } catch (error) {
         this.logger.error(
            `Failed to sync unfollow relationship: ${followerId} -> ${followingId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }
}

// Backward-compatible alias
export { FollowSyncService as UserGraphSyncService };
