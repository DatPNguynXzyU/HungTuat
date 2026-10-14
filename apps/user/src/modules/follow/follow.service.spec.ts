import { Test, TestingModule } from '@nestjs/testing';
import { RetryQueueService } from '@common';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { PrismaService } from '@user/core/database/prisma';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import { OutboxService } from '@user/core/outbox';
import { FollowService } from '@user/modules/follow/follow.service';
import { FOLLOW_REPOSITORY, GRAPH_FOLLOW_REPOSITORY } from '@user/modules/follow/repositories';
import { UserResolverService } from '@user/shared/services';

describe('FollowService', () => {
   let service: FollowService;

   const mockUserProfileRepository = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      incrementFollowingCount: jest.fn(),
      incrementFollowersCount: jest.fn(),
      decrementFollowingCount: jest.fn(),
      decrementFollowersCount: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      findTopUsers: jest.fn().mockResolvedValue([]),
   };

   const mockFollowRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByFollowerAndFollowing: jest.fn(),
      findFollowing: jest.fn().mockResolvedValue([]),
      findFollowRelations: jest.fn().mockResolvedValue({
         followingSet: new Set<string>(),
         followerSet: new Set<string>(),
      }),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      delete: jest.fn(),
   };

   const mockGraphFollowRepository = {
      findFollow: jest.fn().mockResolvedValue(false),
      createFollow: jest.fn().mockResolvedValue(undefined),
      deleteFollow: jest.fn().mockResolvedValue(undefined),
      updateFollowStatus: jest.fn().mockResolvedValue(undefined),
      getFollowers: jest.fn().mockResolvedValue([]),
      getFollowing: jest.fn().mockResolvedValue([]),
      countFollowers: jest.fn().mockResolvedValue(5),
      countFollowing: jest.fn().mockResolvedValue(3),
      getMutualFollowers: jest.fn().mockResolvedValue([]),
      getFollowSuggestions: jest.fn().mockResolvedValue([]),
   };

   const mockOutboxService = {
      createOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
   };

   const mockPrismaService = {
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({})),
   };

   const mockRetryQueueService = {
      add: jest.fn().mockResolvedValue('job-123'),
      processJobs: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowService,
            UserResolverService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: FOLLOW_REPOSITORY,
               useValue: mockFollowRepository,
            },
            {
               provide: GRAPH_FOLLOW_REPOSITORY,
               useValue: mockGraphFollowRepository,
            },
            {
               provide: OutboxService,
               useValue: mockOutboxService,
            },
            {
               provide: PrismaService,
               useValue: mockPrismaService,
            },
            {
               provide: RetryQueueService,
               useValue: mockRetryQueueService,
            },
         ],
      }).compile();

      service = module.get<FollowService>(FollowService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should follow user successfully within transaction and dual-write to graph', async () => {
      const follower = new UserEntity({ userId: 'u1', accountId: 'acc1' });
      const following = new UserEntity({ userId: 'u2', accountId: 'acc2' });

      mockUserProfileRepository.findById.mockImplementation((id: string) => {
         if (id === 'u1') return Promise.resolve(follower);
         if (id === 'u2') return Promise.resolve(following);
         return Promise.resolve(null);
      });

      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
      });
      mockFollowRepository.create.mockResolvedValue(mockFollow);

      const result = await service.followUser('u1', 'u2');
      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockFollowRepository.create).toHaveBeenCalled();
      expect(mockUserProfileRepository.incrementFollowingCount).toHaveBeenCalledWith('u1', expect.anything());
      expect(mockUserProfileRepository.incrementFollowersCount).toHaveBeenCalledWith('u2', expect.anything());
      expect(mockGraphFollowRepository.createFollow).toHaveBeenCalledWith('u1', 'u2', FollowStatus.ACCEPTED);
      expect(mockOutboxService.createOutboxEvent).toHaveBeenCalledWith(
         'f1',
         USER_AGGREGATES.FOLLOW,
         USER_OUTBOX_EVENTS.USER_FOLLOWED,
         expect.anything(),
         expect.anything(),
      );
   });

   it('should unfollow user successfully within transaction and dual-write to graph', async () => {
      const follower = new UserEntity({ userId: 'u1', accountId: 'acc1' });
      const following = new UserEntity({ userId: 'u2', accountId: 'acc2' });

      mockUserProfileRepository.findById.mockImplementation((id: string) => {
         if (id === 'u1') return Promise.resolve(follower);
         if (id === 'u2') return Promise.resolve(following);
         return Promise.resolve(null);
      });

      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
      });
      mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(mockFollow);

      await service.unfollowUser('u1', 'u2');
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockFollowRepository.softDelete).toHaveBeenCalledWith('f1', expect.anything());
      expect(mockUserProfileRepository.decrementFollowingCount).toHaveBeenCalledWith('u1', expect.anything());
      expect(mockUserProfileRepository.decrementFollowersCount).toHaveBeenCalledWith('u2', expect.anything());
      expect(mockGraphFollowRepository.deleteFollow).toHaveBeenCalledWith('u1', 'u2');
   });

   it('should rollback PostgreSQL via Saga compensation when Graph fails in strict mode', async () => {
      const follower = new UserEntity({ userId: 'u1', accountId: 'acc1' });
      const following = new UserEntity({ userId: 'u2', accountId: 'acc2' });

      mockUserProfileRepository.findById.mockImplementation((id: string) => {
         if (id === 'u1') return Promise.resolve(follower);
         if (id === 'u2') return Promise.resolve(following);
         return Promise.resolve(null);
      });

      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
      });
      mockFollowRepository.create.mockResolvedValue(mockFollow);
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('NebulaGraph unavailable'));

      await expect(service.followUser('u1', 'u2', { strict: true })).rejects.toThrow('NebulaGraph unavailable');

      // Verify PostgreSQL rollback compensation
      expect(mockFollowRepository.delete).toHaveBeenCalledWith('f1', expect.anything());
      expect(mockUserProfileRepository.decrementFollowingCount).toHaveBeenCalledWith('u1', expect.anything());
      expect(mockUserProfileRepository.decrementFollowersCount).toHaveBeenCalledWith('u2', expect.anything());
      expect(mockOutboxService.createOutboxEvent).toHaveBeenCalledWith(
         'f1',
         USER_AGGREGATES.FOLLOW,
         USER_OUTBOX_EVENTS.USER_FOLLOW_COMPENSATED,
         expect.anything(),
         expect.anything(),
      );
   });

   it('should enqueue failed graph syncs to RetryQueue when non-strict', async () => {
      const follower = new UserEntity({ userId: 'u1', accountId: 'acc1' });
      const following = new UserEntity({ userId: 'u2', accountId: 'acc2' });

      mockUserProfileRepository.findById.mockImplementation((id: string) => {
         if (id === 'u1') return Promise.resolve(follower);
         if (id === 'u2') return Promise.resolve(following);
         return Promise.resolve(null);
      });

      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
      });
      mockFollowRepository.create.mockResolvedValue(mockFollow);
      mockGraphFollowRepository.createFollow.mockRejectedValue(new Error('NebulaGraph timeout'));

      const result = await service.followUser('u1', 'u2');

      expect(result).toBeDefined();
      expect(mockRetryQueueService.add).toHaveBeenCalledWith(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH, {
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.ACCEPTED,
         retryCount: 0,
      });
      // Should not compensate/delete because job was successfully queued for retry
      expect(mockFollowRepository.delete).not.toHaveBeenCalled();
   });

   it('should accept follow request within transaction and update graph', async () => {
      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.PENDING,
      });
      const updatedFollow = new FollowEntity({
         ...mockFollow,
         status: FollowStatus.ACCEPTED,
      });

      mockFollowRepository.findById.mockResolvedValue(mockFollow);
      mockFollowRepository.updateStatus.mockResolvedValue(updatedFollow);

      const result = await service.acceptFollowRequest('f1');

      expect(result.status).toBe(FollowStatus.ACCEPTED);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith('f1', FollowStatus.ACCEPTED, expect.anything());
      expect(mockUserProfileRepository.incrementFollowingCount).toHaveBeenCalledWith('u1', expect.anything());
      expect(mockUserProfileRepository.incrementFollowersCount).toHaveBeenCalledWith('u2', expect.anything());
      expect(mockGraphFollowRepository.updateFollowStatus).toHaveBeenCalledWith('u1', 'u2', FollowStatus.ACCEPTED);
   });

   it('should reject follow request within transaction and delete from graph', async () => {
      const mockFollow = new FollowEntity({
         followId: 'f1',
         followerId: 'u1',
         followingId: 'u2',
         status: FollowStatus.PENDING,
      });
      const updatedFollow = new FollowEntity({
         ...mockFollow,
         status: FollowStatus.REJECTED,
      });

      mockFollowRepository.findById.mockResolvedValue(mockFollow);
      mockFollowRepository.updateStatus.mockResolvedValue(updatedFollow);

      const result = await service.rejectFollowRequest('f1');

      expect(result.status).toBe(FollowStatus.REJECTED);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockFollowRepository.updateStatus).toHaveBeenCalledWith('f1', FollowStatus.REJECTED, expect.anything());
      expect(mockGraphFollowRepository.deleteFollow).toHaveBeenCalledWith('u1', 'u2');
   });
});
