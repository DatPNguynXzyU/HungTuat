import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus } from '@user/entities';
import type { IFollowGraphRepository } from '@user/repositories';
import type { IUnitOfWork } from '@user/unit-of-work';
import type { RetryQueueService } from '@common';
import { RejectFollowRequestSaga } from '@user/sagas/follow/reject-follow-request.saga';

describe('RejectFollowRequestSaga', () => {
   let saga: RejectFollowRequestSaga;

   let mockUnitOfWork: {
      runInTransaction: jest.Mock;
   };
   let mockFollowRepository: {
      updateStatus: jest.Mock;
   };
   let mockOutboxRepository: {
      create: jest.Mock;
   };
   let mockGraphFollowRepository: {
      deleteFollow: jest.Mock;
      createFollow: jest.Mock;
   };
   let mockRetryQueueService: {
      add: jest.Mock;
   };

   const follow = new FollowEntity({
      followId: 'f-1',
      followerId: 'u-1',
      followingId: 'u-2',
      status: FollowStatus.PENDING,
   });

   const updatedFollow = new FollowEntity({
      ...follow,
      status: FollowStatus.REJECTED,
   });

   beforeEach(() => {
      mockFollowRepository = {
         updateStatus: jest.fn().mockResolvedValue(updatedFollow),
      };

      mockOutboxRepository = {
         create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      };

      mockUnitOfWork = {
         runInTransaction: jest.fn(async (cb: (uow: unknown) => Promise<unknown>) =>
            cb({
               followRepository: mockFollowRepository,
               outboxRepository: mockOutboxRepository,
            }),
         ),
      };

      mockGraphFollowRepository = {
         deleteFollow: jest.fn().mockResolvedValue(undefined),
         createFollow: jest.fn().mockResolvedValue(undefined),
      };

      mockRetryQueueService = {
         add: jest.fn().mockResolvedValue(undefined),
      };

      saga = new RejectFollowRequestSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         mockRetryQueueService as unknown as RetryQueueService,
      );
   });

   it('should execute successfully when status update and graph delete succeed', async () => {
      const result = await saga.execute({ follow });

      expect(result.status).toBe(FollowStatus.REJECTED);
      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith(follow.followId, FollowStatus.REJECTED);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECTED,
         }),
      );
      expect(mockGraphFollowRepository.deleteFollow).toHaveBeenCalledWith(follow.followerId, follow.followingId);
   });

   it('should compensate Postgres update when Graph delete fails in strict mode', async () => {
      mockGraphFollowRepository.deleteFollow.mockRejectedValue(new Error('Graph error'));

      await expect(
         saga.execute({
            follow,
            options: { strict: true },
         }),
      ).rejects.toThrow('Graph error');

      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith(follow.followId, FollowStatus.PENDING);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_REJECT_COMPENSATED,
         }),
      );
   });

   it('should enqueue to RetryQueue when non-strict Graph delete fails', async () => {
      mockGraphFollowRepository.deleteFollow.mockRejectedValue(new Error('Transient failure'));

      const result = await saga.execute({
         follow,
         options: { strict: false },
      });

      expect(result.status).toBe(FollowStatus.REJECTED);
      expect(mockRetryQueueService.add).toHaveBeenCalledWith(
         USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH,
         expect.objectContaining({
            followerId: follow.followerId,
            followingId: follow.followingId,
         }),
      );
   });
});
