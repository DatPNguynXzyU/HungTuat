import { Inject, Injectable, Optional } from '@nestjs/common';
import { RetryQueueService } from '@common';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import {
   FOLLOW_SAGA_NAMES,
   FOLLOW_SAGA_STEPS,
   type FollowSagaName,
   type FollowSagaStep,
} from '@user/modules/follow/constants';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/modules/follow/repositories';
import { UNIT_OF_WORK, type IUnitOfWork } from '@user/unit-of-work';
import {
   AbstractFollowSaga,
   type BaseFollowContext,
   type FollowOperationOptions,
} from '@user/sagas/follow/abstract-follow.saga';

export type { FollowOperationOptions };

export interface FollowUserParams {
   follower: UserEntity;
   following: UserEntity;
   status: FollowStatus;
   options?: FollowOperationOptions;
}

export interface FollowUserContext extends BaseFollowContext {
   follower: UserEntity;
   following: UserEntity;
   status: FollowStatus;
   follow?: FollowEntity;
   graphSynced: boolean;
}

/**
 * FollowUserSaga coordinates dual-write consistency between PostgreSQL and NebulaGraph
 * when a user follows another user, recording outbox events and compensating on failures.
 *
 * Implements the concrete operations defined by the AbstractFollowSaga template.
 */
@Injectable()
export class FollowUserSaga extends AbstractFollowSaga<FollowUserParams, FollowUserContext, FollowEntity> {
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

   protected createContext(params: FollowUserParams): FollowUserContext {
      return {
         follower: params.follower,
         following: params.following,
         status: params.status,
         options: params.options,
         graphSynced: false,
      };
   }

   protected getSagaName(): FollowSagaName {
      return FOLLOW_SAGA_NAMES.FOLLOW_USER;
   }

   protected getPostgresStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.POSTGRES_FOLLOW_TX;
   }

   protected getGraphSyncStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.NEBULA_GRAPH_FOLLOW_SYNC;
   }

   protected async executePostgresStep(ctx: FollowUserContext): Promise<void> {
      const { follower, following, status } = ctx;

      const createdFollow = await this.unitOfWork.runInTransaction(async (uow) => {
         const follow = await uow.followRepository.create({
            followerId: follower.userId,
            followingId: following.userId,
            status,
         });

         if (status === FollowStatus.ACCEPTED) {
            await uow.userProfileRepository.incrementFollowingCount(follower.userId);
            await uow.userProfileRepository.incrementFollowersCount(following.userId);
         }

         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_FOLLOWED,
            payload: {
               followerId: follower.userId,
               followingId: following.userId,
               status: follow.status,
            },
         });

         return follow;
      });

      ctx.follow = createdFollow;
   }

   protected async compensatePostgresStep(ctx: FollowUserContext): Promise<void> {
      if (!ctx.follow) {
         return;
      }

      const { follower, following, status } = ctx;

      await this.unitOfWork.runInTransaction(async (uow) => {
         await uow.followRepository.delete(ctx.follow!.followId);

         if (status === FollowStatus.ACCEPTED) {
            await uow.userProfileRepository.decrementFollowingCount(follower.userId);
            await uow.userProfileRepository.decrementFollowersCount(following.userId);
         }

         await uow.outboxRepository.create({
            aggregateId: ctx.follow!.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_FOLLOW_COMPENSATED,
            payload: {
               followerId: follower.userId,
               followingId: following.userId,
            },
         });
      });
   }

   protected async performGraphSync(ctx: FollowUserContext): Promise<void> {
      const { follower, following, status } = ctx;
      await this.graphFollowRepository.createFollow(follower.userId, following.userId, status);
   }

   protected async performGraphCompensation(ctx: FollowUserContext): Promise<void> {
      const { follower, following } = ctx;
      await this.graphFollowRepository.deleteFollow(follower.userId, following.userId);
   }

   protected getRetryQueueName(): string {
      return USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH;
   }

   protected getRetryQueuePayload(ctx: FollowUserContext): Record<string, unknown> {
      return {
         followerId: ctx.follower.userId,
         followingId: ctx.following.userId,
         status: ctx.status,
         retryCount: 0,
      };
   }

   protected extractResult(ctx: FollowUserContext): FollowEntity {
      return ctx.follow!;
   }
}
