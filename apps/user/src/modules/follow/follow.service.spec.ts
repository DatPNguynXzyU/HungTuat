import { Test, TestingModule } from '@nestjs/testing';
import { FollowService } from './follow.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { FOLLOW_REPOSITORY } from './repositories/follow.repository';
import { GRAPH_FOLLOW_REPOSITORY } from './repositories/follow-graph.repository';
import { OutboxService } from '@user/core/outbox';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';

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
   };

   const mockGraphFollowRepository = {
      findFollow: jest.fn().mockResolvedValue(false),
      createFollow: jest.fn().mockResolvedValue(undefined),
      deleteFollow: jest.fn().mockResolvedValue(undefined),
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

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowService,
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
         ],
      }).compile();

      service = module.get<FollowService>(FollowService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should follow user successfully', async () => {
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
      expect(mockFollowRepository.create).toHaveBeenCalled();
      expect(mockGraphFollowRepository.createFollow).toHaveBeenCalled();
   });

   it('should unfollow user successfully', async () => {
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
      expect(mockFollowRepository.softDelete).toHaveBeenCalledWith('f1');
      expect(mockGraphFollowRepository.deleteFollow).toHaveBeenCalledWith('u1', 'u2');
   });
});
