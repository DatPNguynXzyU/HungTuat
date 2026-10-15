import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, RmqService, type ICommandHandler } from '@common';
import { FollowController } from '@user/modules/follow/follow.controller';
import { FollowService } from '@user/services/domain/follow.service';
import { USER_FOLLOW_COMMAND_HANDLERS } from '@user/commands/follow';

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
            CommandBus,
            ...USER_FOLLOW_COMMAND_HANDLERS,
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

      const commandBus = module.get<CommandBus>(CommandBus);
      for (const handlerClass of USER_FOLLOW_COMMAND_HANDLERS) {
         const handler = module.get<ICommandHandler<never, never>>(handlerClass);
         if (handler) {
            commandBus.registerHandler(handler);
         }
      }

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
