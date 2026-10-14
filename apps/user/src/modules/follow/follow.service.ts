import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException, RetryQueueService, Saga } from '@common';
import {
   USER_AGGREGATES,
   USER_ERROR_CODES,
   USER_OUTBOX_EVENTS,
   USER_RETRY_QUEUES,
   USER_SUGGESTION_REASONS,
   UserSuggestionItemDto,
} from '@contracts/user';
import { OutboxService } from '@user/core/outbox';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import { PrismaService } from '@user/core/database/prisma';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FOLLOW_SAGA_NAMES, FOLLOW_SAGA_STEPS } from '@user/modules/follow/constants';
import {
   FollowGraphRepository,
   FollowRepository,
   FOLLOW_REPOSITORY,
   GRAPH_FOLLOW_REPOSITORY,
} from '@user/modules/follow/repositories';
import { UserResolverService } from '@user/shared/services';

export interface FollowOperationOptions {
   strict?: boolean;
}

@Injectable()
export class FollowService {
   private readonly logger = new Logger(FollowService.name);

   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: UserProfileRepository,
      private readonly userResolverService: UserResolverService,
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository: FollowRepository,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository: FollowGraphRepository,
      private readonly outboxService: OutboxService,
      private readonly prisma: PrismaService,
      @Optional()
      private readonly retryQueueService?: RetryQueueService,
   ) {}

   private async getUserById(userId: string): Promise<UserEntity> {
      return this.userResolverService.resolveUser(userId);
   }

   async followUser(followerId: string, followingId: string, options?: FollowOperationOptions): Promise<FollowEntity> {
      if (followerId === followingId) {
         throw new BadRequestException(USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF);
      }

      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      const existingFollow = await this.graphFollowRepository.findFollow(follower.id, following.id);
      if (existingFollow) {
         throw new ConflictException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followerId, followingId },
         });
      }

      const status = following.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

      interface FollowContext {
         follow?: FollowEntity;
         graphSynced: boolean;
      }

      const context: FollowContext = {
         graphSynced: false,
      };

      const saga = new Saga<FollowContext>(FOLLOW_SAGA_NAMES.FOLLOW_USER);

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.POSTGRES_FOLLOW_TX,
         execute: async (ctx) => {
            const createdFollow = await this.prisma.$transaction(async (tx) => {
               const follow = await this.followRepository.create(
                  {
                     follower: { connect: { userId: follower.userId } },
                     following: { connect: { userId: following.userId } },
                     status,
                  },
                  tx,
               );

               if (status === FollowStatus.ACCEPTED) {
                  await this.userProfileRepository.incrementFollowingCount(follower.id, tx);
                  await this.userProfileRepository.incrementFollowersCount(following.id, tx);
               }

               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.USER_FOLLOWED,
                  {
                     followerId: follower.id,
                     followingId: following.id,
                     status: follow.status,
                  },
                  tx,
               );

               return follow;
            });

            ctx.follow = createdFollow;
         },
         compensate: async (ctx) => {
            if (ctx.follow) {
               await this.prisma.$transaction(async (tx) => {
                  await this.followRepository.delete(ctx.follow!.followId, tx);

                  if (status === FollowStatus.ACCEPTED) {
                     await this.userProfileRepository.decrementFollowingCount(follower.id, tx);
                     await this.userProfileRepository.decrementFollowersCount(following.id, tx);
                  }

                  await this.outboxService.createOutboxEvent(
                     ctx.follow!.followId,
                     USER_AGGREGATES.FOLLOW,
                     USER_OUTBOX_EVENTS.USER_FOLLOW_COMPENSATED,
                     {
                        followerId: follower.id,
                        followingId: following.id,
                     },
                     tx,
                  );
               });
            }
         },
      });

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.NEBULA_GRAPH_FOLLOW_SYNC,
         execute: async (ctx) => {
            if (options?.strict) {
               await this.graphFollowRepository.createFollow(follower.id, following.id, status);
               ctx.graphSynced = true;
               return;
            }

            try {
               await this.graphFollowRepository.createFollow(follower.id, following.id, status);
               ctx.graphSynced = true;
            } catch (err) {
               this.logger.error(
                  `Graph sync failed for follow ${follower.id} -> ${following.id}: ${String(err)}`,
                  err instanceof Error ? err.stack : undefined,
               );

               if (this.retryQueueService) {
                  await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH, {
                     followerId: follower.id,
                     followingId: following.id,
                     status,
                     retryCount: 0,
                  });
               } else {
                  throw err;
               }
            }
         },
         compensate: async (ctx) => {
            if (ctx.graphSynced) {
               try {
                  await this.graphFollowRepository.deleteFollow(follower.id, following.id);
               } catch (compErr) {
                  this.logger.error(
                     `Failed to compensate Graph follow edge ${follower.id} -> ${following.id}: ${String(compErr)}`,
                  );
               }
            }
         },
      });

      await saga.execute(context);
      return context.follow!;
   }

   async unfollowUser(followerId: string, followingId: string, options?: FollowOperationOptions): Promise<void> {
      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      const follow = await this.followRepository.findByFollowerAndFollowing(follower.id, following.id);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followerId, followingId },
         });
      }

      interface UnfollowContext {
         graphDeleted: boolean;
      }

      const context: UnfollowContext = {
         graphDeleted: false,
      };

      const saga = new Saga<UnfollowContext>(FOLLOW_SAGA_NAMES.UNFOLLOW_USER);

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.POSTGRES_UNFOLLOW_TX,
         execute: async () => {
            await this.prisma.$transaction(async (tx) => {
               await this.followRepository.softDelete(follow.followId, tx);

               if (follow.status === FollowStatus.ACCEPTED) {
                  await this.userProfileRepository.decrementFollowingCount(follower.id, tx);
                  await this.userProfileRepository.decrementFollowersCount(following.id, tx);
               }

               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.USER_UNFOLLOWED,
                  {
                     followerId: follower.id,
                     followingId: following.id,
                  },
                  tx,
               );
            });
         },
         compensate: async () => {
            await this.prisma.$transaction(async (tx) => {
               await this.followRepository.restore(follow.followId, tx);

               if (follow.status === FollowStatus.ACCEPTED) {
                  await this.userProfileRepository.incrementFollowingCount(follower.id, tx);
                  await this.userProfileRepository.incrementFollowersCount(following.id, tx);
               }

               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.USER_UNFOLLOW_COMPENSATED,
                  {
                     followerId: follower.id,
                     followingId: following.id,
                  },
                  tx,
               );
            });
         },
      });

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.NEBULA_GRAPH_UNFOLLOW_SYNC,
         execute: async (ctx) => {
            if (options?.strict) {
               await this.graphFollowRepository.deleteFollow(follower.id, following.id);
               ctx.graphDeleted = true;
               return;
            }

            try {
               await this.graphFollowRepository.deleteFollow(follower.id, following.id);
               ctx.graphDeleted = true;
            } catch (err) {
               this.logger.error(
                  `Graph delete failed for unfollow ${follower.id} -> ${following.id}: ${String(err)}`,
                  err instanceof Error ? err.stack : undefined,
               );

               if (this.retryQueueService) {
                  await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH, {
                     followerId: follower.id,
                     followingId: following.id,
                     retryCount: 0,
                  });
               } else {
                  throw err;
               }
            }
         },
         compensate: async (ctx) => {
            if (ctx.graphDeleted) {
               try {
                  await this.graphFollowRepository.createFollow(follower.id, following.id, follow.status);
               } catch (compErr) {
                  this.logger.error(
                     `Failed to compensate Graph unfollow edge ${follower.id} -> ${following.id}: ${String(compErr)}`,
                  );
               }
            }
         },
      });

      await saga.execute(context);
   }

   async acceptFollowRequest(followId: string, options?: FollowOperationOptions): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followId },
         });
      }

      if (follow.status === FollowStatus.ACCEPTED) {
         throw new BadRequestException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followId },
         });
      }

      interface AcceptContext {
         updatedFollow?: FollowEntity;
         graphUpdated: boolean;
      }

      const context: AcceptContext = {
         graphUpdated: false,
      };

      const saga = new Saga<AcceptContext>(FOLLOW_SAGA_NAMES.ACCEPT_FOLLOW_REQUEST);

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.POSTGRES_ACCEPT_FOLLOW_TX,
         execute: async (ctx) => {
            const updated = await this.prisma.$transaction(async (tx) => {
               const res = await this.followRepository.updateStatus(followId, FollowStatus.ACCEPTED, tx);
               await this.userProfileRepository.incrementFollowingCount(follow.followerId, tx);
               await this.userProfileRepository.incrementFollowersCount(follow.followingId, tx);

               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPTED,
                  {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     status: FollowStatus.ACCEPTED,
                  },
                  tx,
               );
               return res;
            });
            ctx.updatedFollow = updated;
         },
         compensate: async () => {
            await this.prisma.$transaction(async (tx) => {
               await this.followRepository.updateStatus(followId, FollowStatus.PENDING, tx);
               await this.userProfileRepository.decrementFollowingCount(follow.followerId, tx);
               await this.userProfileRepository.decrementFollowersCount(follow.followingId, tx);
               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPT_COMPENSATED,
                  {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     status: FollowStatus.PENDING,
                  },
                  tx,
               );
            });
         },
      });

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.NEBULA_GRAPH_ACCEPT_FOLLOW_SYNC,
         execute: async (ctx) => {
            if (options?.strict) {
               await this.graphFollowRepository.updateFollowStatus(
                  follow.followerId,
                  follow.followingId,
                  FollowStatus.ACCEPTED,
               );
               ctx.graphUpdated = true;
               return;
            }

            try {
               await this.graphFollowRepository.updateFollowStatus(
                  follow.followerId,
                  follow.followingId,
                  FollowStatus.ACCEPTED,
               );
               ctx.graphUpdated = true;
            } catch (err) {
               this.logger.error(
                  `Graph accept status update failed for follow ${follow.followerId} -> ${follow.followingId}: ${String(err)}`,
                  err instanceof Error ? err.stack : undefined,
               );
               if (this.retryQueueService) {
                  await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH, {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     status: FollowStatus.ACCEPTED,
                     retryCount: 0,
                  });
               } else {
                  throw err;
               }
            }
         },
         compensate: async (ctx) => {
            if (ctx.graphUpdated) {
               try {
                  await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);
               } catch (compErr) {
                  this.logger.error(`Failed to compensate Graph accept follow status: ${String(compErr)}`);
               }
            }
         },
      });

      await saga.execute(context);
      return context.updatedFollow!;
   }

   async rejectFollowRequest(followId: string, options?: FollowOperationOptions): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followId },
         });
      }

      interface RejectContext {
         updatedFollow?: FollowEntity;
         graphDeleted: boolean;
      }

      const context: RejectContext = {
         graphDeleted: false,
      };

      const saga = new Saga<RejectContext>(FOLLOW_SAGA_NAMES.REJECT_FOLLOW_REQUEST);

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.POSTGRES_REJECT_FOLLOW_TX,
         execute: async (ctx) => {
            const updated = await this.prisma.$transaction(async (tx) => {
               const res = await this.followRepository.updateStatus(followId, FollowStatus.REJECTED, tx);
               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECTED,
                  {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     status: FollowStatus.REJECTED,
                  },
                  tx,
               );
               return res;
            });
            ctx.updatedFollow = updated;
         },
         compensate: async () => {
            await this.prisma.$transaction(async (tx) => {
               await this.followRepository.updateStatus(followId, FollowStatus.PENDING, tx);
               await this.outboxService.createOutboxEvent(
                  follow.followId,
                  USER_AGGREGATES.FOLLOW,
                  USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECT_COMPENSATED,
                  {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     status: FollowStatus.PENDING,
                  },
                  tx,
               );
            });
         },
      });

      saga.addStep({
         name: FOLLOW_SAGA_STEPS.NEBULA_GRAPH_REJECT_FOLLOW_SYNC,
         execute: async (ctx) => {
            if (options?.strict) {
               await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);
               ctx.graphDeleted = true;
               return;
            }

            try {
               await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);
               ctx.graphDeleted = true;
            } catch (err) {
               this.logger.error(
                  `Graph delete failed for reject follow ${follow.followerId} -> ${follow.followingId}: ${String(err)}`,
                  err instanceof Error ? err.stack : undefined,
               );
               if (this.retryQueueService) {
                  await this.retryQueueService.add(USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH, {
                     followerId: follow.followerId,
                     followingId: follow.followingId,
                     retryCount: 0,
                  });
               } else {
                  throw err;
               }
            }
         },
         compensate: async (ctx) => {
            if (ctx.graphDeleted) {
               try {
                  await this.graphFollowRepository.createFollow(follow.followerId, follow.followingId, follow.status);
               } catch (compErr) {
                  this.logger.error(`Failed to compensate Graph reject follow: ${String(compErr)}`);
               }
            }
         },
      });

      await saga.execute(context);
      return context.updatedFollow!;
   }

   async getFollowers(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const user = await this.getUserById(userId);

      const graphResults = await this.graphFollowRepository.getFollowers(user.id, status, skip, take);

      return graphResults.map((result) => {
         return new FollowEntity({
            followId: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
      });
   }

   async getFollowing(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const user = await this.getUserById(userId);

      const graphResults = await this.graphFollowRepository.getFollowing(user.id, status, skip, take);

      return graphResults.map((result) => {
         return new FollowEntity({
            followId: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
      });
   }

   async getFollowersCount(userId: string, status?: FollowStatus): Promise<number> {
      const user = await this.getUserById(userId);
      return this.graphFollowRepository.countFollowers(user.id, status);
   }

   async getFollowingCount(userId: string, status?: FollowStatus): Promise<number> {
      const user = await this.getUserById(userId);
      return this.graphFollowRepository.countFollowing(user.id, status);
   }

   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      const user1 = await this.getUserById(userId1);
      const user2 = await this.getUserById(userId2);
      return this.graphFollowRepository.getMutualFollowers(user1.id, user2.id);
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<UserSuggestionItemDto[]> {
      const user = await this.getUserById(userId);

      const followingList = await this.followRepository.findFollowing(user.id, FollowStatus.ACCEPTED, 0, 1000);
      const alreadyFollowingIds = new Set(followingList.map((f) => f.followingId));
      alreadyFollowingIds.add(user.id);

      let graphCandidateIds: string[] = [];
      try {
         const rawGraphIds = await this.graphFollowRepository.getFollowSuggestions(user.id, limit * 2);
         graphCandidateIds = rawGraphIds.filter((id) => !alreadyFollowingIds.has(id));
      } catch (err) {
         this.logger.warn(`Failed to retrieve graph follow suggestions for ${user.id}: ${String(err)}`);
      }

      const selectedGraphIds = Array.from(new Set(graphCandidateIds)).slice(0, limit);
      const graphIdSet = new Set(selectedGraphIds);

      let popularUsers: UserEntity[] = [];
      const neededCount = limit - selectedGraphIds.length;
      if (neededCount > 0) {
         const excludeIds = Array.from(new Set([...alreadyFollowingIds, ...selectedGraphIds]));
         popularUsers = await this.userProfileRepository.findTopUsers(neededCount, excludeIds);
      }

      const graphUserEntities =
         selectedGraphIds.length > 0 ? await this.userProfileRepository.findByIds(selectedGraphIds) : [];

      const allCandidateEntities = [...graphUserEntities, ...popularUsers];
      if (allCandidateEntities.length === 0) {
         return [];
      }

      const candidateIds = allCandidateEntities.map((u) => u.id);
      const { followerSet } = await this.followRepository.findFollowRelations(user.id, candidateIds);

      const mutualCounts = new Map<string, number>();
      await Promise.all(
         allCandidateEntities.map(async (candidate) => {
            if (graphIdSet.has(candidate.id)) {
               try {
                  const mutuals = await this.graphFollowRepository.getMutualFollowers(user.id, candidate.id);
                  mutualCounts.set(candidate.id, mutuals.length);
               } catch {
                  mutualCounts.set(candidate.id, 0);
               }
            } else {
               mutualCounts.set(candidate.id, 0);
            }
         }),
      );

      return allCandidateEntities.map((candidate): UserSuggestionItemDto => {
         const isGraphCandidate = graphIdSet.has(candidate.id);
         return {
            id: candidate.id,
            username: candidate.username,
            displayName: candidate.displayName,
            avatar: candidate.avatar,
            bio: candidate.bio,
            isVerified: candidate.settings?.isVerified ?? false,
            followersCount: candidate.stats?.followersCount ?? 0,
            followingCount: candidate.stats?.followingCount ?? 0,
            mutualCount: mutualCounts.get(candidate.id) ?? 0,
            isFollowing: false,
            isFollower: followerSet.has(candidate.id),
            reason: isGraphCandidate ? USER_SUGGESTION_REASONS.MUTUAL_FRIENDS : USER_SUGGESTION_REASONS.POPULAR,
         };
      });
   }
}
