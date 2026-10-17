import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
import { GenderDto, USER_PATTERNS } from '@contracts/user';
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

   it('should send update_username message pattern with user context', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'auth-user-1', username: 'new_username' }));

      const result = await service.updateUsername('auth-user-1', 'new_username', mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPDATE_USERNAME },
         {
            data: { userId: 'auth-user-1', username: 'new_username' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'auth-user-1', username: 'new_username' });
   });

   it('should update display name via updateDisplayName', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'auth-user-1', displayName: 'New Display Name' }));

      const result = await service.updateDisplayName('auth-user-1', 'New Display Name', mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
         {
            data: { userId: 'auth-user-1', id: 'auth-user-1', displayName: 'New Display Name' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'auth-user-1', displayName: 'New Display Name' });
   });

   it('should update personal info via updatePersonalInfo', async () => {
      const dob = '1995-05-20';
      mockUserClient.send.mockReturnValue(of({ id: 'auth-user-1', dateOfBirth: dob, gender: GenderDto.MALE }));

      const result = await service.updatePersonalInfo(
         'auth-user-1',
         { dateOfBirth: dob, gender: GenderDto.MALE },
         mockUser,
      );
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: USER_PATTERNS.UPDATE_USER_PROFILE },
         {
            data: { userId: 'auth-user-1', id: 'auth-user-1', dateOfBirth: dob, gender: GenderDto.MALE },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual({ id: 'auth-user-1', dateOfBirth: dob, gender: GenderDto.MALE });
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
