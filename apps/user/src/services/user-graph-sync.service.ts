import { Injectable } from '@nestjs/common';
import { AppLogger } from '@common';
import { GraphFollowRepository } from '@user/graph';
import { UserEntity } from '@user/entities';

@Injectable()
export class UserGraphSyncService {
   private readonly logger: AppLogger;

   constructor(
      private readonly graphFollowRepository: GraphFollowRepository,
      logger: AppLogger,
   ) {
      this.logger = logger;
      this.logger.setContext(UserGraphSyncService.name);
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
