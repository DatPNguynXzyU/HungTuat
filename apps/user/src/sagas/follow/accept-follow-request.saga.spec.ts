import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus } from '@user/entities';
import type { IFollowGraphRepository } from '@user/repositories';
import type { IUnitOfWork } from '@user/unit-of-work';
import type { RetryQueueService } from '@common';
import { AcceptFollowRequestSaga } from '@user/sagas/follow/accept-follow-request.saga';

describe('AcceptFollowRequestSaga', () => {
   let saga: AcceptFollowRequestSaga;

   let mockUnitOfWork: {
      runInTransaction: jest.Mock;
   };
   let mockFollowRepository: {
      updateStatus: jest.Mock;
   };
   let mockUserProfileRepository: {
      incrementFollowingCount: jest.Mock;
      incrementFollowersCount: jest.Mock;
      decrementFollowingCount: jest.Mock;
      decrementFollowersCount: jest.Mock;
   };
   let mockOutboxRepository: {
      create: jest.Mock;
   };
   let mockGraphFollowRepository: {
      updateFollowStatus: jest.Mock;
      deleteFollow: jest.Mock;
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
      status: FollowStatus.ACCEPTED,
   });

   beforeEach(() => {
      mockFollowRepository = {
         updateStatus: jest.fn().mockResolvedValue(updatedFollow),
      };

      mockUserProfileRepository = {
         incrementFollowingCount: jest.fn().mockResolvedValue(undefined),
         incrementFollowersCount: jest.fn().mockResolvedValue(undefined),
         decrementFollowingCount: jest.fn().mockResolvedValue(undefined),
         decrementFollowersCount: jest.fn().mockResolvedValue(undefined),
      };

      mockOutboxRepository = {
         create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      };

      mockUnitOfWork = {
         runInTransaction: jest.fn(async (cb: (uow: unknown) => Promise<unknown>) =>
            cb({
               followRepository: mockFollowRepository,
               userProfileRepository: mockUserProfileRepository,
               outboxRepository: mockOutboxRepository,
            }),
         ),
      };

      mockGraphFollowRepository = {
         updateFollowStatus: jest.fn().mockResolvedValue(undefined),
         deleteFollow: jest.fn().mockResolvedValue(undefined),
      };

      mockRetryQueueService = {
         add: jest.fn().mockResolvedValue(undefined),
      };

      saga = new AcceptFollowRequestSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         mockRetryQueueService as unknown as RetryQueueService,
      );
   });

   it('should execute successfully when status update and graph status update succeed', async () => {
      const result = await saga.execute({ follow });

      expect(result.status).toBe(FollowStatus.ACCEPTED);
      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith(follow.followId, FollowStatus.ACCEPTED);
      expect(mockUserProfileRepository.incrementFollowingCount).toHaveBeenCalledWith(follow.followerId);
      expect(mockUserProfileRepository.incrementFollowersCount).toHaveBeenCalledWith(follow.followingId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPTED,
         }),
      );
      expect(mockGraphFollowRepository.updateFollowStatus).toHaveBeenCalledWith(
         follow.followerId,
         follow.followingId,
         FollowStatus.ACCEPTED,
      );
   });

   it('should compensate Postgres update and counters when Graph update fails in strict mode', async () => {
      mockGraphFollowRepository.updateFollowStatus.mockRejectedValue(new Error('Graph down'));

      await expect(
         saga.execute({
            follow,
            options: { strict: true },
         }),
      ).rejects.toThrow('Graph down');

      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith(follow.followId, FollowStatus.PENDING);
      expect(mockUserProfileRepository.decrementFollowingCount).toHaveBeenCalledWith(follow.followerId);
      expect(mockUserProfileRepository.decrementFollowersCount).toHaveBeenCalledWith(follow.followingId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.FOLLOW_REQUEST_ACCEPT_COMPENSATED,
         }),
      );
   });

   it('should enqueue to RetryQueue when non-strict Graph update fails', async () => {
      mockGraphFollowRepository.updateFollowStatus.mockRejectedValue(new Error('Network error'));

      const result = await saga.execute({
         follow,
         options: { strict: false },
      });

      expect(result.status).toBe(FollowStatus.ACCEPTED);
      expect(mockRetryQueueService.add).toHaveBeenCalledWith(
         USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH,
         expect.objectContaining({
            followerId: follow.followerId,
            followingId: follow.followingId,
            status: FollowStatus.ACCEPTED,
         }),
      );
   });
});
