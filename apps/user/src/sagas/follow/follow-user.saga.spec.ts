import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import type { IFollowGraphRepository } from '@user/modules/follow/repositories';
import type { IUnitOfWork } from '@user/unit-of-work';
import type { RetryQueueService } from '@common';
import { FollowUserSaga } from '@user/sagas/follow/follow-user.saga';

describe('FollowUserSaga', () => {
   let saga: FollowUserSaga;

   let mockUnitOfWork: {
      runInTransaction: jest.Mock;
   };
   let mockFollowRepository: {
      create: jest.Mock;
      delete: jest.Mock;
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
      createFollow: jest.Mock;
      deleteFollow: jest.Mock;
   };
   let mockRetryQueueService: {
      add: jest.Mock;
   };

   const follower = new UserEntity({ userId: 'u-follower', accountId: 'acc-1' });
   const following = new UserEntity({ userId: 'u-following', accountId: 'acc-2' });
   const createdFollow = new FollowEntity({
      followId: 'f-1',
      followerId: follower.userId,
      followingId: following.userId,
      status: FollowStatus.ACCEPTED,
   });

   beforeEach(() => {
      mockFollowRepository = {
         create: jest.fn().mockResolvedValue(createdFollow),
         delete: jest.fn().mockResolvedValue(undefined),
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
         createFollow: jest.fn().mockResolvedValue(undefined),
         deleteFollow: jest.fn().mockResolvedValue(undefined),
      };

      mockRetryQueueService = {
         add: jest.fn().mockResolvedValue(undefined),
      };

      saga = new FollowUserSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         mockRetryQueueService as unknown as RetryQueueService,
      );
   });

   it('should execute successfully when both Postgres and Graph sync succeed', async () => {
      const result = await saga.execute({
         follower,
         following,
         status: FollowStatus.ACCEPTED,
      });

      expect(result).toEqual(createdFollow);
      expect(mockFollowRepository.create).toHaveBeenCalledWith({
         followerId: follower.userId,
         followingId: following.userId,
         status: FollowStatus.ACCEPTED,
      });
      expect(mockUserProfileRepository.incrementFollowingCount).toHaveBeenCalledWith(follower.userId);
      expect(mockUserProfileRepository.incrementFollowersCount).toHaveBeenCalledWith(following.userId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: createdFollow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_FOLLOWED,
         }),
      );
      expect(mockGraphFollowRepository.createFollow).toHaveBeenCalledWith(
         follower.userId,
         following.userId,
         FollowStatus.ACCEPTED,
      );
   });

   it('should compensate Postgres transaction in strict mode when Graph sync fails', async () => {
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('Graph cluster down'));

      await expect(
         saga.execute({
            follower,
            following,
            status: FollowStatus.ACCEPTED,
            options: { strict: true },
         }),
      ).rejects.toThrow('Graph cluster down');

      expect(mockFollowRepository.delete).toHaveBeenCalledWith(createdFollow.followId);
      expect(mockUserProfileRepository.decrementFollowingCount).toHaveBeenCalledWith(follower.userId);
      expect(mockUserProfileRepository.decrementFollowersCount).toHaveBeenCalledWith(following.userId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: createdFollow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_FOLLOW_COMPENSATED,
         }),
      );
   });

   it('should enqueue to RetryQueue when non-strict Graph sync fails', async () => {
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('Temporary timeout'));

      const result = await saga.execute({
         follower,
         following,
         status: FollowStatus.ACCEPTED,
         options: { strict: false },
      });

      expect(result).toEqual(createdFollow);
      expect(mockRetryQueueService.add).toHaveBeenCalledWith(
         USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH,
         expect.objectContaining({
            followerId: follower.userId,
            followingId: following.userId,
            status: FollowStatus.ACCEPTED,
         }),
      );
   });
});
