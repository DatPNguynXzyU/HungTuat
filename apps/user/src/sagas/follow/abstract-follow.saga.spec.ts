import { FollowEntity, FollowStatus } from '@user/core/database/entities';
import type { IFollowGraphRepository } from '@user/modules/follow/repositories';
import type { IUnitOfWork } from '@user/unit-of-work';
import type { RetryQueueService } from '@common';
import {
   AbstractFollowSaga,
   type BaseFollowContext,
   type FollowOperationOptions,
} from '@user/sagas/follow/abstract-follow.saga';
import {
   FOLLOW_SAGA_NAMES,
   FOLLOW_SAGA_STEPS,
   type FollowSagaName,
   type FollowSagaStep,
} from '@user/modules/follow/constants';

interface TestParams {
   followerId: string;
   followingId: string;
   options?: FollowOperationOptions;
}

interface TestContext extends BaseFollowContext {
   followerId: string;
   followingId: string;
   postgresExecuted: boolean;
   postgresCompensated: boolean;
   graphSynced: boolean;
   graphCompensated: boolean;
   follow?: FollowEntity;
}

class ConcreteTestFollowSaga extends AbstractFollowSaga<TestParams, TestContext, FollowEntity> {
   protected createContext(params: TestParams): TestContext {
      return {
         followerId: params.followerId,
         followingId: params.followingId,
         options: params.options,
         postgresExecuted: false,
         postgresCompensated: false,
         graphSynced: false,
         graphCompensated: false,
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

   protected async executePostgresStep(ctx: TestContext): Promise<void> {
      await Promise.resolve();
      ctx.postgresExecuted = true;
      ctx.follow = new FollowEntity({
         followId: 'f-test-1',
         followerId: ctx.followerId,
         followingId: ctx.followingId,
         status: FollowStatus.ACCEPTED,
      });
   }

   protected async compensatePostgresStep(ctx: TestContext): Promise<void> {
      await Promise.resolve();
      ctx.postgresCompensated = true;
   }

   protected async performGraphSync(ctx: TestContext): Promise<void> {
      await this.graphFollowRepository.createFollow(ctx.followerId, ctx.followingId, FollowStatus.ACCEPTED);
   }

   protected async performGraphCompensation(ctx: TestContext): Promise<void> {
      ctx.graphCompensated = true;
      await this.graphFollowRepository.deleteFollow(ctx.followerId, ctx.followingId);
   }

   protected getRetryQueueName(): string {
      return 'test_retry_queue';
   }

   protected getRetryQueuePayload(ctx: TestContext): Record<string, unknown> {
      return {
         followerId: ctx.followerId,
         followingId: ctx.followingId,
      };
   }

   protected extractResult(ctx: TestContext): FollowEntity {
      return ctx.follow!;
   }
}

describe('AbstractFollowSaga', () => {
   let saga: ConcreteTestFollowSaga;
   let mockUnitOfWork: {
      runInTransaction: jest.Mock;
   };
   let mockGraphFollowRepository: {
      createFollow: jest.Mock;
      deleteFollow: jest.Mock;
   };
   let mockRetryQueueService: {
      add: jest.Mock;
   };

   beforeEach(() => {
      mockUnitOfWork = {
         runInTransaction: jest.fn(async (cb: (repositories: unknown) => Promise<unknown>) => cb({})),
      };
      mockGraphFollowRepository = {
         createFollow: jest.fn().mockResolvedValue(undefined),
         deleteFollow: jest.fn().mockResolvedValue(undefined),
      };
      mockRetryQueueService = {
         add: jest.fn().mockResolvedValue(undefined),
      };

      saga = new ConcreteTestFollowSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         mockRetryQueueService as unknown as RetryQueueService,
      );
   });

   it('should execute full template flow when steps succeed', async () => {
      const result = await saga.execute({
         followerId: 'user-1',
         followingId: 'user-2',
      });

      expect(result).toBeDefined();
      expect(result.followId).toBe('f-test-1');
      expect(mockGraphFollowRepository.createFollow).toHaveBeenCalledWith('user-1', 'user-2', FollowStatus.ACCEPTED);
      expect(mockRetryQueueService.add).not.toHaveBeenCalled();
   });

   it('should fail fast and compensate in strict mode when graph sync fails', async () => {
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('Graph connection lost'));

      await expect(
         saga.execute({
            followerId: 'user-1',
            followingId: 'user-2',
            options: { strict: true },
         }),
      ).rejects.toThrow('Graph connection lost');

      expect(mockRetryQueueService.add).not.toHaveBeenCalled();
   });

   it('should enqueue to retry queue and continue when non-strict graph sync fails', async () => {
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('Transient graph failure'));

      const result = await saga.execute({
         followerId: 'user-1',
         followingId: 'user-2',
         options: { strict: false },
      });

      expect(result).toBeDefined();
      expect(mockRetryQueueService.add).toHaveBeenCalledWith('test_retry_queue', {
         followerId: 'user-1',
         followingId: 'user-2',
      });
   });

   it('should throw error when graph sync fails in non-strict mode without retry queue service', async () => {
      const sagaWithoutRetry = new ConcreteTestFollowSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         undefined,
      );
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('DB unreachable'));

      await expect(
         sagaWithoutRetry.execute({
            followerId: 'user-1',
            followingId: 'user-2',
         }),
      ).rejects.toThrow('DB unreachable');
   });
});
