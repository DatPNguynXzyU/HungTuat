import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { GrpcStatus, SERVICES } from '@common';
import {
   GenderDto,
   USER_ERROR_CODES,
   USER_ERROR_REASONS,
   USER_PATTERNS,
   USER_V1_GRPC_CLIENT,
   USER_V1_GRPC_SERVICE_NAME,
} from '@contracts/user';
import type { JwtPayload } from '@common';
import { UsersService } from '@/modules/users/users.service';

describe('UsersService', () => {
   let service: UsersService;
   const mockUserClient = {
      send: jest.fn(),
   };
   const mockUserGrpcService = {
      checkUsername: jest.fn(),
   };
   const mockUserGrpcClient = {
      getService: jest.fn().mockReturnValue(mockUserGrpcService),
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
            {
               provide: USER_V1_GRPC_CLIENT,
               useValue: mockUserGrpcClient,
            },
         ],
      }).compile();

      service = module.get<UsersService>(UsersService);
      service.onModuleInit();
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should check username availability via gRPC client', async () => {
      mockUserGrpcService.checkUsername.mockReturnValue(of({ available: true, username: 'john_doe' }));

      const result = await service.checkUsername('john_doe');
      expect(mockUserGrpcClient.getService).toHaveBeenCalledWith(USER_V1_GRPC_SERVICE_NAME);
      expect(mockUserGrpcService.checkUsername).toHaveBeenCalledWith({ username: 'john_doe' }, expect.anything());
      expect(result).toEqual({ available: true, username: 'john_doe' });
   });

   it('should map and handle gRPC errors when checking username', async () => {
      const serializedError = {
         message: JSON.stringify({
            errorCode: USER_ERROR_CODES.INVALID_USERNAME_FORMAT,
            params: { username: 'invalid_user', reason: USER_ERROR_REASONS.INVALID_FORMAT },
         }),
         code: GrpcStatus.INVALID_ARGUMENT,
      };
      mockUserGrpcService.checkUsername.mockReturnValue(throwError(() => serializedError));

      await expect(service.checkUsername('invalid_user')).rejects.toThrow();
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
