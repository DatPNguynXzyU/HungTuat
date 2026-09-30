import { Test, TestingModule } from '@nestjs/testing';
import type { JwtPayload } from '@common';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

describe('UsersController', () => {
   let controller: UsersController;
   const mockUsersService = {
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
   };

   const mockUser: JwtPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['user'],
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UsersController],
         providers: [
            {
               provide: UsersService,
               useValue: mockUsersService,
            },
         ],
      }).compile();

      controller = module.get<UsersController>(UsersController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should get all users with user context', async () => {
      mockUsersService.getAllUsers.mockResolvedValue([{ id: 'u1' }]);

      const result = await controller.getAllUsers('1', '10', mockUser);
      expect(mockUsersService.getAllUsers).toHaveBeenCalledWith(1, 10, mockUser);
      expect(result).toEqual([{ id: 'u1' }]);
   });

   it('should get user by id with user context', async () => {
      mockUsersService.getUserById.mockResolvedValue({ id: 'u1' });

      const result = await controller.getUserById('u1', mockUser);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith('u1', mockUser);
      expect(result).toEqual({ id: 'u1' });
   });

   it('should update user with user context', async () => {
      mockUsersService.updateUser.mockResolvedValue({ id: 'u1', displayName: 'Updated' });

      const result = await controller.updateUser('u1', { displayName: 'Updated' }, mockUser);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('u1', { displayName: 'Updated' }, mockUser);
      expect(result).toEqual({ id: 'u1', displayName: 'Updated' });
   });
});
