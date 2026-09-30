import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { SERVICES } from '@common';
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

   it('should send get_user_by_id message with user context', async () => {
      mockUserClient.send.mockReturnValue(of({ id: 'u1' }));

      const result = await service.getUserById('u1', mockUser);
      expect(mockUserClient.send).toHaveBeenCalledWith(
         { cmd: 'get_user_by_id' },
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
         { cmd: 'users.get_all' },
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
         { cmd: 'update_user_profile' },
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
});
