import { Test, TestingModule } from '@nestjs/testing';
import { RmqService } from '@common';
import { SearchController } from './search.controller';
import { UserSearchService } from './user-search.service';

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
