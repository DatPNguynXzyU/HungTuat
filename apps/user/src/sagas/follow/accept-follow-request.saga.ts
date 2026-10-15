import { Inject, Injectable, Optional } from '@nestjs/common';
import { RetryQueueService } from '@common';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus } from '@user/entities';
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

export interface AcceptFollowRequestParams {
   follow: FollowEntity;
   options?: FollowOperationOptions;
}

export interface AcceptFollowRequestContext extends BaseFollowContext {
   follow: FollowEntity;
   updatedFollow?: FollowEntity;
   [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_UPDATED]: boolean;
}

/**
 * AcceptFollowRequestSaga coordinates dual-write consistency between PostgreSQL and NebulaGraph
 * when an existing pending follow request is accepted.
 *
 * Implements the concrete operations defined by the AbstractFollowSaga template.
 */
@Injectable()
export class AcceptFollowRequestSaga extends AbstractFollowSaga<
   AcceptFollowRequestParams,
   AcceptFollowRequestContext,
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

   protected createContext(params: AcceptFollowRequestParams): AcceptFollowRequestContext {
      return {
         follow: params.follow,
         options: params.options,
         [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_UPDATED]: false,
         [FOLLOW_GRAPH_STATUS_KEYS.GRAPH_SYNCED]: false,
      };
   }

   protected getSagaName(): FollowSagaName {
      return FOLLOW_SAGA_NAMES.ACCEPT_FOLLOW_REQUEST;
   }

   protected getPostgresStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.POSTGRES_ACCEPT_FOLLOW_TX;
   }

   protected getGraphSyncStepName(): FollowSagaStep {
      return FOLLOW_SAGA_STEPS.NEBULA_GRAPH_ACCEPT_FOLLOW_SYNC;
   }

   protected async executePostgresStep(ctx: AcceptFollowRequestContext): Promise<void> {
      const { follow } = ctx;

      const updated = await this.unitOfWork.runInTransaction(async (uow) => {
         const res = await uow.followRepository.updateStatus(follow.followId, FollowStatus.ACCEPTED);
         await uow.userProfileRepository.incrementFollowingCount(follow.followerId);
         await uow.userProfileRepository.incrementFollowersCount(follow.followingId);

         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPTED,
            payload: {
               followerId: follow.followerId,
               followingId: follow.followingId,
               status: FollowStatus.ACCEPTED,
            },
         });
         return res;
      });

      ctx.updatedFollow = updated;
   }

   protected async compensatePostgresStep(ctx: AcceptFollowRequestContext): Promise<void> {
      const { follow } = ctx;

      await this.unitOfWork.runInTransaction(async (uow) => {
         await uow.followRepository.updateStatus(follow.followId, FollowStatus.PENDING);
         await uow.userProfileRepository.decrementFollowingCount(follow.followerId);
         await uow.userProfileRepository.decrementFollowersCount(follow.followingId);
         await uow.outboxRepository.create({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPT_COMPENSATED,
            payload: {
               followerId: follow.followerId,
               followingId: follow.followingId,
               status: FollowStatus.PENDING,
            },
         });
      });
   }

   protected async performGraphSync(ctx: AcceptFollowRequestContext): Promise<void> {
      const { follow } = ctx;
      await this.graphFollowRepository.updateFollowStatus(follow.followerId, follow.followingId, FollowStatus.ACCEPTED);
   }

   protected async performGraphCompensation(ctx: AcceptFollowRequestContext): Promise<void> {
      const { follow } = ctx;
      await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);
   }

   protected getRetryQueueName(): string {
      return USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH;
   }

   protected getRetryQueuePayload(ctx: AcceptFollowRequestContext): Record<string, unknown> {
      return {
         followerId: ctx.follow.followerId,
         followingId: ctx.follow.followingId,
         status: FollowStatus.ACCEPTED,
         retryCount: 0,
      };
   }

   protected extractResult(ctx: AcceptFollowRequestContext): FollowEntity {
      return ctx.updatedFollow!;
   }
}
