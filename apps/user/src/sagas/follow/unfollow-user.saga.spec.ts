import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import type { IFollowGraphRepository } from '@user/modules/follow/repositories';
import type { IUnitOfWork } from '@user/unit-of-work';
import type { RetryQueueService } from '@common';
import { UnfollowUserSaga } from '@user/sagas/follow/unfollow-user.saga';

describe('UnfollowUserSaga', () => {
   let saga: UnfollowUserSaga;

   let mockUnitOfWork: {
      runInTransaction: jest.Mock;
   };
   let mockFollowRepository: {
      softDelete: jest.Mock;
      restore: jest.Mock;
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
   const follow = new FollowEntity({
      followId: 'f-1',
      followerId: follower.userId,
      followingId: following.userId,
      status: FollowStatus.ACCEPTED,
   });

   beforeEach(() => {
      mockFollowRepository = {
         softDelete: jest.fn().mockResolvedValue(undefined),
         restore: jest.fn().mockResolvedValue(undefined),
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

      saga = new UnfollowUserSaga(
         mockUnitOfWork as unknown as IUnitOfWork,
         mockGraphFollowRepository as unknown as IFollowGraphRepository,
         mockRetryQueueService as unknown as RetryQueueService,
      );
   });

   it('should execute successfully when soft-delete and graph delete succeed', async () => {
      await saga.execute({
         follower,
         following,
         follow,
      });

      expect(mockFollowRepository.softDelete).toHaveBeenCalledWith(follow.followId);
      expect(mockUserProfileRepository.decrementFollowingCount).toHaveBeenCalledWith(follower.userId);
      expect(mockUserProfileRepository.decrementFollowersCount).toHaveBeenCalledWith(following.userId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_UNFOLLOWED,
         }),
      );
      expect(mockGraphFollowRepository.deleteFollow).toHaveBeenCalledWith(follower.userId, following.userId);
   });

   it('should compensate Postgres soft-delete when Graph delete fails in strict mode', async () => {
      mockGraphFollowRepository.deleteFollow.mockRejectedValue(new Error('Graph timeout'));

      await expect(
         saga.execute({
            follower,
            following,
            follow,
            options: { strict: true },
         }),
      ).rejects.toThrow('Graph timeout');

      expect(mockFollowRepository.restore).toHaveBeenCalledWith(follow.followId);
      expect(mockUserProfileRepository.incrementFollowingCount).toHaveBeenCalledWith(follower.userId);
      expect(mockUserProfileRepository.incrementFollowersCount).toHaveBeenCalledWith(following.userId);
      expect(mockOutboxRepository.create).toHaveBeenCalledWith(
         expect.objectContaining({
            aggregateId: follow.followId,
            aggregateType: USER_AGGREGATES.FOLLOW,
            eventType: USER_OUTBOX_EVENTS.USER_UNFOLLOW_COMPENSATED,
         }),
      );
   });

   it('should enqueue to RetryQueue when non-strict Graph delete fails', async () => {
      mockGraphFollowRepository.deleteFollow.mockRejectedValue(new Error('Transient error'));

      await saga.execute({
         follower,
         following,
         follow,
         options: { strict: false },
      });

      expect(mockRetryQueueService.add).toHaveBeenCalledWith(
         USER_RETRY_QUEUES.SYNC_UNFOLLOW_FROM_GRAPH,
         expect.objectContaining({
            followerId: follower.userId,
            followingId: following.userId,
         }),
      );
   });
});
