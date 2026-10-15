import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppLogger, RetryQueueService } from '@common';
import { USER_RETRY_QUEUES } from '@contracts/user';
import { FollowStatus, UserEntity } from '@user/entities';
import { UserEntityBuilder } from '@user/builders';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/repositories';
import type { IUserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.interface';

@Injectable()
export class UserGraphSyncService implements IUserGraphSyncService {
   private readonly logger: AppLogger;

   constructor(
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository: IFollowGraphRepository,
      logger: AppLogger,
      @Optional() private readonly retryQueueService?: RetryQueueService,
   ) {
      this.logger = logger;
      this.logger.setContext(UserGraphSyncService.name);
   }

   async syncUserToGraph(user: UserEntity): Promise<void> {
      try {
         this.logger.log(`Syncing user to graph: ${user.userId} (${user.username ?? user.accountId})`);
         await this.graphFollowRepository.createOrUpdateUser({
            userId: user.userId,
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
            `Failed to sync user to graph: ${user.userId}`,
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
            await this.syncUserToGraph(UserEntityBuilder.create().fromPrismaUser(user).build());
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
export { UserGraphSyncService as FollowSyncService };
