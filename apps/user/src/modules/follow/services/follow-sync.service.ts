import { Injectable, Optional } from '@nestjs/common';
import { AppLogger, RetryQueueService } from '@common';
import { USER_RETRY_QUEUES } from '@contracts/user';
import { FollowStatus, UserEntity } from '@user/core/database/entities';
import { FollowGraphRepository } from '@user/modules/follow/repositories/follow-graph.repository';

@Injectable()
export class FollowSyncService {
   private readonly logger: AppLogger;

   constructor(
      private readonly graphFollowRepository: FollowGraphRepository,
      logger: AppLogger,
      @Optional() private readonly retryQueueService?: RetryQueueService,
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

   async processSyncRetries(): Promise<{ processed: number }> {
      let total = 0;
      if (!this.retryQueueService) return { processed: 0 };

      total += await this.retryQueueService.processJobs<UserEntity>(
         USER_RETRY_QUEUES.SYNC_USER_TO_GRAPH,
         async (user) => {
            await this.syncUserToGraph(new UserEntity(user));
         },
      );

      total += await this.retryQueueService.processJobs<{
         followerId: string;
         followingId: string;
         status?: FollowStatus;
      }>(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH, async (job) => {
         await this.graphFollowRepository.createFollow(job.followerId, job.followingId, job.status);
      });

      total += await this.retryQueueService.processJobs<{ followerId: string; followingId: string }>(
         USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH,
         async (job) => {
            await this.graphFollowRepository.deleteFollow(job.followerId, job.followingId);
         },
      );

      return { processed: total };
   }
}

// Backward-compatible alias
export { FollowSyncService as UserGraphSyncService };
