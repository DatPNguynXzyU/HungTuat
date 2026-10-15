import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger, RetryQueueService } from '@common';
import { USER_OUTBOX_EVENTS, USER_RETRY_QUEUES } from '@contracts/user';
import { USER_PROFILE_REPOSITORY } from '@user/repositories/user-profile.repository';
import { FollowEntity, FollowStatus, UserEntity } from '@user/entities';
import { OutboxService } from '@user/outbox';
import { FollowService } from '@user/services/domain/follow.service';
import { FOLLOW_REPOSITORY } from '@user/repositories/follow.repository';
import { FollowGraphRepository, GRAPH_FOLLOW_REPOSITORY } from '@user/repositories/follow-graph.repository';
import { UserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.service';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UNIT_OF_WORK } from '@user/unit-of-work';

describe('Integration: Dual-Write Consistency & Transaction Boundaries', () => {
   let followService: FollowService;
   let followSyncService: UserGraphSyncService;
   let retryQueueService: RetryQueueService;

   // In-memory simulation of PostgreSQL tables
   const mockPostgresDb = {
      follows: new Map<string, FollowEntity>(),
      userStats: new Map<string, { followingCount: number; followersCount: number }>(),
      outbox: new Array<{ eventId: string; eventType: string; aggregateId: string }>(),
   };

   // In-memory simulation of NebulaGraph edges
   const mockGraphDb = {
      follows: new Set<string>(),
   };

   const mockOutboxRepository = {
      create: jest.fn((data: { aggregateId: string; aggregateType: string; eventType: string }) => {
         mockPostgresDb.outbox.push({
            eventId: `evt-${Date.now()}`,
            aggregateId: data.aggregateId,
            eventType: data.eventType,
         });
         return Promise.resolve({ eventId: 'outbox-1' });
      }),
   };

   const mockUnitOfWork = {
      runInTransaction: jest.fn(
         async (
            callback: (uow: {
               followRepository: unknown;
               userProfileRepository: unknown;
               outboxRepository: unknown;
            }) => Promise<unknown>,
         ) => {
            return callback({
               followRepository: mockFollowRepository,
               userProfileRepository: mockUserProfileRepository,
               outboxRepository: mockOutboxRepository,
            });
         },
      ),
   };

   const mockUserProfileRepository = {
      findById: jest.fn((id: string) => {
         return Promise.resolve(new UserEntity({ userId: id, accountId: `acc-${id}` }));
      }),
      findByAccountId: jest.fn((accId: string) => {
         return Promise.resolve(new UserEntity({ userId: accId, accountId: accId }));
      }),
      incrementFollowingCount: jest.fn((userId: string) => {
         const stats = mockPostgresDb.userStats.get(userId) || { followingCount: 0, followersCount: 0 };
         stats.followingCount++;
         mockPostgresDb.userStats.set(userId, stats);
         return Promise.resolve();
      }),
      decrementFollowingCount: jest.fn((userId: string) => {
         const stats = mockPostgresDb.userStats.get(userId) || { followingCount: 0, followersCount: 0 };
         stats.followingCount = Math.max(0, stats.followingCount - 1);
         mockPostgresDb.userStats.set(userId, stats);
         return Promise.resolve();
      }),
      incrementFollowersCount: jest.fn((userId: string) => {
         const stats = mockPostgresDb.userStats.get(userId) || { followingCount: 0, followersCount: 0 };
         stats.followersCount++;
         mockPostgresDb.userStats.set(userId, stats);
         return Promise.resolve();
      }),
      decrementFollowersCount: jest.fn((userId: string) => {
         const stats = mockPostgresDb.userStats.get(userId) || { followingCount: 0, followersCount: 0 };
         stats.followersCount = Math.max(0, stats.followersCount - 1);
         mockPostgresDb.userStats.set(userId, stats);
         return Promise.resolve();
      }),
   };

   const mockFollowRepository = {
      create: jest.fn(
         (data: {
            followerId?: string;
            followingId?: string;
            follower?: { connect: { userId: string } };
            following?: { connect: { userId: string } };
            status: FollowStatus;
         }) => {
            const followerId = data.followerId ?? data.follower?.connect.userId ?? '';
            const followingId = data.followingId ?? data.following?.connect.userId ?? '';
            const followId = `f-${followerId}-${followingId}`;
            const entity = new FollowEntity({
               followId,
               followerId,
               followingId,
               status: data.status,
               createdAt: new Date(),
               updatedAt: new Date(),
            });
            mockPostgresDb.follows.set(followId, entity);
            return Promise.resolve(entity);
         },
      ),
      delete: jest.fn((followId: string) => {
         const existing = mockPostgresDb.follows.get(followId);
         mockPostgresDb.follows.delete(followId);
         return Promise.resolve(existing || null);
      }),
      softDelete: jest.fn((followId: string) => {
         const existing = mockPostgresDb.follows.get(followId);
         if (existing) {
            existing.deletedAt = new Date();
         }
         return Promise.resolve(existing);
      }),
      restore: jest.fn((followId: string) => {
         const existing = mockPostgresDb.follows.get(followId);
         if (existing) {
            existing.deletedAt = null;
         }
         return Promise.resolve(existing);
      }),
      findByFollowerAndFollowing: jest.fn((followerId: string, followingId: string) => {
         const followId = `f-${followerId}-${followingId}`;
         const existing = mockPostgresDb.follows.get(followId);
         return Promise.resolve(existing && !existing.deletedAt ? existing : null);
      }),
   };

   const mockGraphFollowRepository = {
      findFollow: jest.fn((followerId: string, followingId: string) => {
         return Promise.resolve(mockGraphDb.follows.has(`${followerId}->${followingId}`));
      }),
      createFollow: jest.fn((followerId: string, followingId: string) => {
         mockGraphDb.follows.add(`${followerId}->${followingId}`);
         return Promise.resolve();
      }),
      deleteFollow: jest.fn((followerId: string, followingId: string) => {
         mockGraphDb.follows.delete(`${followerId}->${followingId}`);
         return Promise.resolve();
      }),
   };

   const mockOutboxService = {
      createOutboxEvent: jest.fn((aggregateId: string, _type: string, eventType: string) => {
         mockPostgresDb.outbox.push({
            eventId: `evt-${Date.now()}`,
            aggregateId,
            eventType,
         });
         return Promise.resolve({ id: 'outbox-1' });
      }),
   };

   beforeEach(async () => {
      mockPostgresDb.follows.clear();
      mockPostgresDb.userStats.clear();
      mockPostgresDb.outbox.length = 0;
      mockGraphDb.follows.clear();
      jest.clearAllMocks();

      retryQueueService = new RetryQueueService();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowService,
            UserGraphSyncService,
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
               provide: FollowGraphRepository,
               useValue: mockGraphFollowRepository,
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
               provide: UNIT_OF_WORK,
               useValue: mockUnitOfWork,
            },
            {
               provide: RetryQueueService,
               useValue: retryQueueService,
            },
            {
               provide: AppLogger,
               useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() },
            },
         ],
      }).compile();

      followService = module.get<FollowService>(FollowService);
      followSyncService = module.get<UserGraphSyncService>(UserGraphSyncService);
   });

   it('should maintain zero data inconsistency: rolls back PostgreSQL when Graph fails (strict mode)', async () => {
      mockGraphFollowRepository.createFollow.mockRejectedValueOnce(new Error('NebulaGraph cluster partition down'));

      await expect(followService.followUser('userA', 'userB', { strict: true })).rejects.toThrow(
         'NebulaGraph cluster partition down',
      );

      expect(mockPostgresDb.follows.has('f-userA-userB')).toBe(false);

      // Counters must be rolled back to 0
      const statsA = mockPostgresDb.userStats.get('userA') || { followingCount: 0 };
      const statsB = mockPostgresDb.userStats.get('userB') || { followersCount: 0 };
      expect(statsA.followingCount).toBe(0);
      expect(statsB.followersCount).toBe(0);

      // Graph has no orphan edge
      expect(mockGraphDb.follows.has('userA->userB')).toBe(false);

      // Compensation outbox event was recorded
      expect(mockPostgresDb.outbox.some((e) => e.eventType === USER_OUTBOX_EVENTS.USER_FOLLOW_COMPENSATED)).toBe(true);
   });

   it('should enqueue failed graph syncs to RetryQueue and process them to eventual consistency', async () => {
      // First attempt: Graph write fails
      mockGraphFollowRepository.createFollow.mockRejectedValueOnce(new Error('Transient timeout'));

      const follow = await followService.followUser('user1', 'user2');
      expect(follow).toBeDefined();

      // PostgreSQL write succeeded
      expect(mockPostgresDb.follows.has('f-user1-user2')).toBe(true);
      // Graph write temporarily failed
      expect(mockGraphDb.follows.has('user1->user2')).toBe(false);

      // Verify job was stored in retry queue
      const queueSize = await retryQueueService.getQueueSize(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH);
      expect(queueSize).toBe(1);

      // Restore implementation so retry adds edge to graph db
      mockGraphFollowRepository.createFollow.mockImplementationOnce((followerId: string, followingId: string) => {
         mockGraphDb.follows.add(`${followerId}->${followingId}`);
         return Promise.resolve();
      });

      // Process pending sync jobs in the retry queue
      const { processed } = await followSyncService.processSyncRetries();
      expect(processed).toBe(1);

      // Verify eventual consistency reached: Graph now has the follow edge!
      expect(mockGraphDb.follows.has('user1->user2')).toBe(true);
      const remainingQueueSize = await retryQueueService.getQueueSize(USER_RETRY_QUEUES.SYNC_FOLLOW_TO_GRAPH);
      expect(remainingQueueSize).toBe(0);
   });

   it('should handle concurrent follow operations under failure scenarios cleanly', async () => {
      // Simulate 5 concurrent follow operations where 2 fail Graph write in strict mode and 3 succeed
      const operations = [
         followService.followUser('user1', 'targetA'),
         followService.followUser('user2', 'targetA'),
         followService.followUser('user3', 'targetA'),
         followService.followUser('user4', 'targetA', { strict: true }),
         followService.followUser('user5', 'targetA', { strict: true }),
      ];

      // Make the 4th and 5th fail
      mockGraphFollowRepository.createFollow
         .mockResolvedValueOnce(undefined) // user1
         .mockResolvedValueOnce(undefined) // user2
         .mockResolvedValueOnce(undefined) // user3
         .mockRejectedValueOnce(new Error('Graph error user4'))
         .mockRejectedValueOnce(new Error('Graph error user5'));

      const results = await Promise.allSettled(operations);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('rejected');
      expect(results[4].status).toBe('rejected');

      // TargetA should have exactly 3 followers, not 5
      const targetStats = mockPostgresDb.userStats.get('targetA');
      expect(targetStats?.followersCount).toBe(3);

      // PostgreSQL should only retain the 3 successful follows
      expect(mockPostgresDb.follows.has('f-user1-targetA')).toBe(true);
      expect(mockPostgresDb.follows.has('f-user2-targetA')).toBe(true);
      expect(mockPostgresDb.follows.has('f-user3-targetA')).toBe(true);
      expect(mockPostgresDb.follows.has('f-user4-targetA')).toBe(false);
      expect(mockPostgresDb.follows.has('f-user5-targetA')).toBe(false);
   });
});
