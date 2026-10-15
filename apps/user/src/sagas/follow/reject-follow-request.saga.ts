import { Inject, Injectable, Optional } from '@nestjs/common';
import { RetryQueueService } from '@common';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus } from '@user/core/database/entities';
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

export interface RejectFollowRequestParams {
   follow: FollowEntity;
   options?: FollowOperationOptions;
}

export interface RejectFollowRequestContext extends BaseFollowContext {
   follow: FollowEntity;
   updatedFollow?: FollowEntity;
   graphDeleted: boolean;
}

/**
 * RejectFollowRequestSaga coordinates dual-write consistency between PostgreSQL and NebulaGraph
 * when an existing follow request is rejected.
 *
 * Implements the concrete operations defined by the AbstractFollowSaga template.
 */
@Injectable()
export class RejectFollowRequestSaga extends AbstractFollowSaga<
   RejectFollowRequestParams,
   RejectFollowRequestContext,
   FollowEntity
> {
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

   protected createContext(params: RejectFollowRequestParams): RejectFollowRequestContext {
      return {
         follow: params.follow,
         options: params.options,
         graphDeleted: false,
         graphSynced: false,
      };
   }

   protected getSagaName(): FollowSagaName {
      return FOLLOW_SAGA_NAMES.REJECT_FOLLOW_REQUEST;
   }

   protected getPostgresStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.POSTGRES_REJECT_FOLLOW_TX;
   }

   protected getGraphSyncStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.NEBULA_GRAPH_REJECT_FOLLOW_SYNC;
   }

   protected async executePostgresStep(ctx: RejectFollowRequestContext): Promise<void> {
      const { follow } = ctx;

      const updated = await this.unitOfWork.runInTransaction(async (uow) => {
         const res = await uow.followRepository.updateStatus(follow.followId, FollowStatus.REJECTED);
         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECTED,
            payload: {
               followerId: follow.followerId,
               followingId: follow.followingId,
               status: FollowStatus.REJECTED,
            },
         });
         return res;
      });

      ctx.updatedFollow = updated;
   }

   protected async compensatePostgresStep(ctx: RejectFollowRequestContext): Promise<void> {
      const { follow } = ctx;

      await this.unitOfWork.runInTransaction(async (uow) => {
         await uow.followRepository.updateStatus(follow.followId, FollowStatus.PENDING);
         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECT_COMPENSATED,
            payload: {
               followerId: follow.followerId,
               followingId: follow.followingId,
               status: FollowStatus.PENDING,
            },
         });
      });
   }

   protected async performGraphSync(ctx: RejectFollowRequestContext): Promise<void> {
      const { follow } = ctx;
      await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);
   }

   protected async performGraphCompensation(ctx: RejectFollowRequestContext): Promise<void> {
      const { follow } = ctx;
      await this.graphFollowRepository.createFollow(follow.followerId, follow.followingId, follow.status);
   }

   protected getRetryQueueName(): string {
      return USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH;
   }

   protected getRetryQueuePayload(ctx: RejectFollowRequestContext): Record<string, unknown> {
      return {
         followerId: ctx.follow.followerId,
         followingId: ctx.follow.followingId,
         retryCount: 0,
      };
   }

   protected extractResult(ctx: RejectFollowRequestContext): FollowEntity {
      return ctx.updatedFollow!;
   }
}
