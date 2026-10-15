import type { UserSearchResponseDto } from '@contracts/user';
import type { UserSearchService } from '@user/services/domain/user-search.service';
import { SearchUsersCommand, SearchUsersHandler } from '@user/commands/search';

describe('Search Command Handlers', () => {
   let userSearchService: jest.Mocked<Partial<UserSearchService>>;

   const mockSearchResult: UserSearchResponseDto = {
      items: [
         {
            userId: 'u-1',
            username: 'test_user',
            displayName: 'Test User',
            isVerified: false,
            followersCount: 5,
            followingCount: 3,
            isFollowing: false,
            isFollower: false,
            isSelf: false,
         },
      ],
      meta: {
         nextCursor: null,
         hasMore: false,
         limit: 10,
         total: 1,
      },
   };

   beforeEach(() => {
      userSearchService = {
         searchUsers: jest.fn().mockResolvedValue(mockSearchResult),
      };
   });

   describe('SearchUsersHandler', () => {
      it('should search users with parameters', async () => {
         const handler = new SearchUsersHandler(userSearchService as UserSearchService);
         const result = await handler.execute(new SearchUsersCommand('alice', 10, 'cur-1', 'me-id'));

         expect(userSearchService.searchUsers).toHaveBeenCalledWith('alice', 10, 'cur-1', 'me-id');
         expect(result).toEqual(mockSearchResult);
      });
   });
});
