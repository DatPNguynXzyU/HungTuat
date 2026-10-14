import { Test, TestingModule } from '@nestjs/testing';
import { RmqService } from '@common';
import { FollowController } from '@user/modules/follow/follow.controller';
import { FollowService } from '@user/modules/follow/follow.service';

describe('FollowController', () => {
   let controller: FollowController;

   const mockFollowService = {
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      acceptFollowRequest: jest.fn(),
      rejectFollowRequest: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFollowersCount: jest.fn(),
      getFollowingCount: jest.fn(),
      getMutualFollowers: jest.fn(),
      getFollowSuggestions: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [FollowController],
         providers: [
            {
               provide: FollowService,
               useValue: mockFollowService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      controller = module.get<FollowController>(FollowController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should handle getFollowersCount', async () => {
      mockFollowService.getFollowersCount.mockResolvedValue(10);
      const result = await controller.getFollowersCount({ userId: 'u1' });
      expect(result).toEqual({ count: 10 });
   });
});
