import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from '@search/search.service';
import { UserSearchService } from '@search/domains/user-search';

describe('SearchService', () => {
   let service: SearchService;

   const mockUserSearchService = {
      indexUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      searchUsers: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            SearchService,
            {
               provide: UserSearchService,
               useValue: mockUserSearchService,
            },
         ],
      }).compile();

      service = module.get<SearchService>(SearchService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('indexUser', () => {
      it('should delegate to userSearchService.indexUser', async () => {
         const user = { id: 'u-1', username: 'john' };
         await service.indexUser(user);
         expect(mockUserSearchService.indexUser).toHaveBeenCalledWith(user);
      });
   });

   describe('updateUser', () => {
      it('should delegate to userSearchService.updateUser', async () => {
         const user = { id: 'u-1', username: 'john_doe' };
         await service.updateUser(user);
         expect(mockUserSearchService.updateUser).toHaveBeenCalledWith(user);
      });
   });

   describe('deleteUser', () => {
      it('should delegate to userSearchService.deleteUser', async () => {
         await service.deleteUser('u-1');
         expect(mockUserSearchService.deleteUser).toHaveBeenCalledWith('u-1');
      });
   });

   describe('searchUsers', () => {
      it('should delegate to userSearchService.searchUsers', async () => {
         const mockRes = { items: [], nextCursor: null, hasMore: false, total: 0 };
         mockUserSearchService.searchUsers.mockResolvedValue(mockRes);

         const result = await service.searchUsers('john', 10, 'cur-1');
         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('john', 10, 'cur-1');
         expect(result).toEqual(mockRes);
      });
   });
});
