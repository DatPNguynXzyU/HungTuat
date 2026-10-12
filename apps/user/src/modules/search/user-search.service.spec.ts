import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { UserSearchService } from './user-search.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserIndexListener } from './listeners/user-index.listener';

describe('UserSearchService', () => {
   let service: UserSearchService;

   const mockSearchClient = {
      send: jest.fn(),
      emit: jest.fn(),
   };

   const mockUserProfileRepository = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
   };

   const mockFollowRepository = {
      findFollowRelations: jest.fn().mockResolvedValue({
         followingSet: new Set<string>(),
         followerSet: new Set<string>(),
      }),
   };

   const mockUserIndexListener = {
      emitSearchIndexEvent: jest.fn(),
      emitSearchDeleteEvent: jest.fn(),
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
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: FOLLOW_REPOSITORY,
               useValue: mockFollowRepository,
            },
            {
               provide: UserIndexListener,
               useValue: mockUserIndexListener,
            },
         ],
      }).compile();

      service = module.get<UserSearchService>(UserSearchService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should search users and return items', async () => {
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
   });
});
