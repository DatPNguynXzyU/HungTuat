import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { UserSearchService } from '@user/modules/search/user-search.service';
import { FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserResolverService } from '@user/shared/services/user-resolver.service';

describe('UserSearchService', () => {
   let service: UserSearchService;

   const mockSearchClient = {
      send: jest.fn(),
      emit: jest.fn(),
   };

   const mockUserResolverService = {
      findUser: jest.fn(),
      resolveUser: jest.fn(),
   };

   const mockFollowRepository = {
      findFollowRelations: jest.fn().mockResolvedValue({
         followingSet: new Set<string>(['u2']),
         followerSet: new Set<string>(),
      }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserSearchService,
            {
               provide: SERVICES.SEARCH_SERVICE,
               useValue: mockSearchClient,
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

   it('should search users and return items without currentUserId', async () => {
      mockSearchClient.send.mockReturnValue(
         of({
            items: [
               {
                  id: 'u1',
                  username: 'john',
                  displayName: 'John Doe',
               },
            ],
            nextCursor: null,
            hasMore: false,
            total: 1,
         }),
      );

      const result = await service.searchUsers('john');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].username).toBe('john');
      expect(result.items[0].isFollowing).toBe(false);
   });

   it('should resolve currentUserId and calculate follow relations', async () => {
      mockSearchClient.send.mockReturnValue(
         of({
            items: [
               {
                  id: 'u2',
                  username: 'jane',
                  displayName: 'Jane Doe',
               },
            ],
            nextCursor: null,
            hasMore: false,
            total: 1,
         }),
      );

      mockUserResolverService.findUser.mockResolvedValue({
         id: 'u1-resolved',
         accountId: 'acc-1',
      });

      const result = await service.searchUsers('jane', 20, undefined, 'acc-1');
      expect(mockUserResolverService.findUser).toHaveBeenCalledWith('acc-1');
      expect(mockFollowRepository.findFollowRelations).toHaveBeenCalledWith('u1-resolved', ['u2']);
      expect(result.items[0].isFollowing).toBe(true);
   });
});
