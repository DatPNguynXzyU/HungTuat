import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { USER_PATTERNS } from '@contracts/user';
import type { JwtPayload } from '@common';
import { UsersService } from '@/modules/users/users.service';

describe('UsersService', () => {
   let service: UsersService;
   const mockUserClient = {
      send: jest.fn(),
   };
   const mockUser: JwtPayload = {
      sub: 'auth-user-1',
      email: 'user@example.com',
      roles: ['user'],
      jti: 'session-456',
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UsersService,
            {
               provide: SERVICES.USER_SERVICE,
               useValue: mockUserClient,
            },
         ],
      }).compile();

      service = module.get<UsersService>(UsersService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should send check_username message pattern', async () => {
      mockUserClient.send.mockReturnValue(of({ available: true, username: 'john_doe' }));

      const result = await service.checkUsername('john_doe');
      expect(mockUserClient.send).toHaveBeenCalledWith({ cmd: USER_PATTERNS.CHECK_USERNAME }, { username: 'john_doe' });
      expect(result).toEqual({ available: true, username: 'john_doe' });
   });

   it('should send get_user_by_id message with user context', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'u1' }));

      const result = await service.getUserById('u1', mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.GET_USER_BY_ID },
         {
            data: { id: 'u1' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'u1' });
   });

   it('should send users.get_all message with user context', async () => {
      mockUserClient.send.mockReturnValue(of([{ id: 'u1' }]));

      const result = await service.getAllUsers(1, 10, mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.GET_ALL_USERS },
         {
            data: { page: 1, limit: 10 },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual([{ id: 'u1' }]);
   });

   it('should send update_user_profile message with user context', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'u1', displayName: 'New Name' }));

      const result = await service.updateUser('u1', { displayName: 'New Name' }, mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
         {
            data: { id: 'u1', displayName: 'New Name' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'u1', displayName: 'New Name' });
   });

   it('should update current user profile via updateMyProfile delegating to updateUser', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'auth-user-1', displayName: 'Self Name' }));

      const result = await service.updateMyProfile({ displayName: 'Self Name' }, mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
         {
            data: { id: 'auth-user-1', displayName: 'Self Name' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'auth-user-1', displayName: 'Self Name' });
   });

   it('should send upsert_user_profile message via upsertUser', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'u1', displayName: 'Upserted Name' }));

      const result = await service.upsertUser('u1', { displayName: 'Upserted Name' }, mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPSERT_USER_PROFILE },
         {
            data: { id: 'u1', displayName: 'Upserted Name' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'u1', displayName: 'Upserted Name' });
   });

   it('should send get_date_of_birth message with userId', async () => {
      const mockDob = { userId: 'u1', dateOfBirth: '1995-06-15T00:00:00.000Z', age: 31 };
      mockUserClient.send.mockReturnValue(of(mockDob));

      const result = await service.getDateOfBirth('u1');
      expect(mockUserClient.send).toHaveBeenCalledWith({ cmd: USER_PATTERNS.GET_DATE_OF_BIRTH }, { userId: 'u1' });
      expect(result).toEqual(mockDob);
   });

   it('should send search_users message with query, limit, cursor, and currentUserId', async () => {
      const mockSearchRes = { items: [], meta: { nextCursor: null, hasMore: false, limit: 10, total: 0 } };
      mockUserClient.send.mockReturnValue(of(mockSearchRes));

      const result = await service.searchUsers('alex', 10, 'cursor_val', mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.SEARCH_USERS },
         { query: 'alex', limit: 10, cursor: 'cursor_val', currentUserId: mockUser.sub },
      );
      expect(result).toEqual(mockSearchRes);
   });

   it('should send get_follow_suggestions message with userId and limit', async () => {
      const mockSuggestions = [{ id: 'u2', username: 'alex' }];
      mockUserClient.send.mockReturnValue(of(mockSuggestions));

      const result = await service.getFollowSuggestions(10, mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.GET_FOLLOW_SUGGESTIONS },
         { userId: mockUser.sub, limit: 10 },
      );
      expect(result).toEqual(mockSuggestions);
   });
});
