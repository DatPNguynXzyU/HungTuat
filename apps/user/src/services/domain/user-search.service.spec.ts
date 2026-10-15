import { Test, TestingModule } from '@nestjs/testing';
import { UserSearchService } from '@user/services/domain/user-search.service';
import { FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { SEARCH_ADAPTER, type ISearchAdapter } from '@user/adapters/search/search.adapter.interface';

describe('UserSearchService (Domain)', () => {
   let service: UserSearchService;

   const mockSearchAdapter: jest.Mocked<ISearchAdapter> = {
      searchUsers: jest.fn(),
      emitIndexEvent: jest.fn(),
   };

   const mockUserResolverService = {
      findUser: jest.fn(),
      resolveUser: jest.fn(),
   };

   const mockFollowRepository = {
      findFollowRelations: jest.fn().mockResolvedValue({
         followingSet: new Set<string>(['user_target_2']),
         followerSet: new Set<string>(),
      }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserSearchService,
            {
               provide: SEARCH_ADAPTER,
               useValue: mockSearchAdapter,
            },
            {
               provide: UserResolverService,
               useValue: mockUserResolverService,
            },
            {
               provide: FOLLOW_REPOSITORY,
               useValue: mockFollowRepository,
            },
         ],
      }).compile();

      service = module.get<UserSearchService>(UserSearchService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should search users via search adapter and return items with explicit userId', async () => {
      mockSearchAdapter.searchUsers.mockResolvedValue({
         items: [
            {
               userId: 'user_target_1',
               documentId: 'doc_user_target_1',
               username: 'john_doe',
               displayName: 'John Doe',
            },
         ],
         nextCursor: null,
         hasMore: false,
         total: 1,
      });

      const result = await service.searchUsers('john_doe');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe('user_target_1');
      expect(result.items[0].username).toBe('john_doe');
      expect(result.items[0].isFollowing).toBe(false);
      expect(mockSearchAdapter.searchUsers).toHaveBeenCalledWith('john_doe', 20, undefined);
   });

   it('should resolve currentUserId and calculate follow relations', async () => {
      mockSearchAdapter.searchUsers.mockResolvedValue({
         items: [
            {
               userId: 'user_target_2',
               documentId: 'doc_user_target_2',
               username: 'jane_doe',
               displayName: 'Jane Doe',
            },
         ],
         nextCursor: null,
         hasMore: false,
         total: 1,
      });

      mockUserResolverService.findUser.mockResolvedValue({
         userId: 'user_current_resolved',
         accountId: 'account_uuid_1',
      });

      const result = await service.searchUsers('jane_doe', 20, undefined, 'account_uuid_1');
      expect(mockUserResolverService.findUser).toHaveBeenCalledWith('account_uuid_1');
      expect(mockFollowRepository.findFollowRelations).toHaveBeenCalledWith('user_current_resolved', ['user_target_2']);
      expect(result.items[0].isFollowing).toBe(true);
   });
});
