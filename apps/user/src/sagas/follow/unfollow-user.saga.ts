import { Inject, Injectable, Optional } from '@nestjs/common';
import { RetryQueueService } from '@common';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus, UserEntity } from '@user/entities';
import {
   FOLLOW_GRAPH_STATUS_KEYS,
   FOLLOW_SAGA_NAMES,
   FOLLOW_SAGA_STEPS,
   type FollowSagaName,
   type FollowSagaStep,
} from '@user/constants';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/repositories';
import { UNIT_OF_WORK, type IUnitOfWork } from '@user/unit-of-work';
import {
   AbstractFollowSaga,
   type BaseFollowContext,
   type FollowOperationOptions,
} from '@user/sagas/follow/abstract-follow.saga';

export interface UnfollowUserParams {
   follower: UserEntity;
   following: UserEntity;
   follow: FollowEntity;
   options?: FollowOperationOptions;
}

export interface UnfollowUserContext extends BaseFollowContext {
   follower: UserEntity;
   following: UserEntity;
   follow: FollowEntity;
   [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_DELETED]: boolean;
}

/**
 * UnfollowUserSaga coordinates dual-write consistency between PostgreSQL and NebulaGraph
 * when a user unfollows another user, handling soft-deletion, count updates, and outbox compensation.
 *
 * Implements the concrete operations defined by the AbstractFollowSaga template.
 */
@Injectable()
export class UnfollowUserSaga extends AbstractFollowSaga<UnfollowUserParams, UnfollowUserContext, void> {
   constructor(
      @Inject(UNIT_OF_WORK)
      unitOfWork: IUnitOfWork,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      graphFollowRepository: IFollowGraphRepository,
      @Optional()
      retryQueueService?: RetryQueueService,
   ) {
      super(unitOfWork, graphFollowRepository, retryQueueService);
   }

   protected createContext(params: UnfollowUserParams): UnfollowUserContext {
      return {
         follower: params.follower,
         following: params.following,
         follow: params.follow,
         options: params.options,
         [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_DELETED]: false,
         [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_SYNCED]: false,
      };
   }

   protected getSagaName(): FollowSagaName {
      return FOLLOW_SAGA_NAMES.UNFOLLOW_USER;
   }

   protected getPostgresStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.POSTGRES_UNFOLLOW_TX;
   }

   protected getGraphSyncStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.NEBULA_GRAPH_UNFOLLOW_SYNC;
   }

   protected async executePostgresStep(ctx: UnfollowUserContext): Promise<void> {
      const { follower, following, follow } = ctx;

      await this.unitOfWork.runInTransaction(async (uow) => {
         await uow.followRepository.softDelete(follow.followId);

         if (follow.status === FollowStatus.ACCEPTED) {
            await uow.userProfileRepository.decrementFollowingCount(follower.userId);
            await uow.userProfileRepository.decrementFollowersCount(following.userId);
         }

         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_UNFOLLOWED,
            payload: {
               followerId: follower.userId,
               followingId: following.userId,
            },
         });
      });
   }

   protected async compensatePostgresStep(ctx: UnfollowUserContext): Promise<void> {
      const { follower, following, follow } = ctx;

      await this.unitOfWork.runInTransaction(async (uow) => {
         await uow.followRepository.restore(follow.followId);

         if (follow.status === FollowStatus.ACCEPTED) {
            await uow.userProfileRepository.incrementFollowingCount(follower.userId);
            await uow.userProfileRepository.incrementFollowersCount(following.userId);
         }

         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_UNFOLLOW_COMPENSATED,
            payload: {
               followerId: follower.userId,
               followingId: following.userId,
            },
         });
      });
   }

   protected async performGraphSync(ctx: UnfollowUserContext): Promise<void> {
      const { follower, following } = ctx;
      await this.graphFollowRepository.deleteFollow(follower.userId, following.userId);
   }

   protected async performGraphCompensation(ctx: UnfollowUserContext): Promise<void> {
      const { follower, following, follow } = ctx;
      await this.graphFollowRepository.createFollow(follower.userId, following.userId, follow.status);
   }

   protected getRetryQueueName(): string {
      return USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH;
   }

   protected getRetryQueuePayload(ctx: UnfollowUserContext): Record<string, unknown> {
      return {
         followerId: ctx.follower.userId,
         followingId: ctx.following.userId,
         retryCount: 0,
      };
   }

   protected extractResult(_ctx: UnfollowUserContext): void {
      // Returns void on successful unfollow
   }
}
