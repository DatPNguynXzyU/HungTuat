import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, RmqService, type ICommandHandler } from '@common';
import { SearchController } from '@user/modules/search/search.controller';
import { UserSearchService } from '@user/services/domain/user-search.service';
import { USER_SEARCH_COMMAND_HANDLERS } from '@user/commands/search';

describe('SearchController', () => {
   let controller: SearchController;

   const mockUserSearchService = {
      searchUsers: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [SearchController],
         providers: [
            CommandBus,
            ...USER_SEARCH_COMMAND_HANDLERS,
            {
               provide: UserSearchService,
               useValue: mockUserSearchService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      const commandBus = module.get<CommandBus>(CommandBus);
      for (const handlerClass of USER_SEARCH_COMMAND_HANDLERS) {
         const handler = module.get<ICommandHandler<never, never>>(handlerClass);
         if (handler) {
            commandBus.registerHandler(handler);
         }
      }

      controller = module.get<SearchController>(SearchController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should call searchUsers', async () => {
      mockUserSearchService.searchUsers.mockResolvedValue({
         items: [],
         meta: { nextCursor: null, hasMore: false, limit: 20, total: 0 },
      });

      const result = await controller.searchUsers({ query: 'test' });
      expect(result.items).toEqual([]);
      expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('test', undefined, undefined, undefined);
   });
});
