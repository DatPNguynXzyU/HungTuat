import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, type JwtPayload } from '@common';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

describe('UsersController', () => {
   let controller: UsersController;
   const mockUsersService = {
      checkUsername: jest.fn(),
      createProfile: jest.fn(),
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      updateMyProfile: jest.fn(),
      getMyProfile: jest.fn(),
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

   describe('checkUsername', () => {
      it('should return availability status for valid username', async () => {
         mockUsersService.checkUsername.mockResolvedValue({ available: true, username: 'john_doe' });

         const result = await controller.checkUsername('john_doe');

         expect(mockUsersService.checkUsername).toHaveBeenCalledWith('john_doe');
         expect(result).toEqual({ available: true, username: 'john_doe' });
      });

      it('should throw BadRequestException if username is empty', async () => {
         await expect(controller.checkUsername('')).rejects.toThrow(BadRequestException);
      });
   });

   describe('createProfile', () => {
      it('should create profile for current authenticated user', async () => {
         const createProfileDto = {
            displayName: 'John Doe',
            username: 'johndoe',
         };
         mockUsersService.createProfile.mockResolvedValue({ id: 'u1', ...createProfileDto });

         const result = await controller.createProfile(createProfileDto, mockUser);

         expect(mockUsersService.createProfile).toHaveBeenCalledWith(createProfileDto, mockUser);
         expect(result).toEqual({ id: 'u1', ...createProfileDto });
      });
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

   it('should get current user profile via getMyProfile', async () => {
      mockUsersService.getMyProfile.mockResolvedValue({
         id: 'u1',
         displayName: 'My Name',
         username: 'myusername',
      });

      const result = await controller.getMyProfile(mockUser);
      expect(mockUsersService.getMyProfile).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ id: 'u1', displayName: 'My Name', username: 'myusername' });
   });

   it('should update current user profile via updateMyProfile', async () => {
      mockUsersService.updateMyProfile.mockResolvedValue({
         id: 'u1',
         displayName: 'My Name',
         username: 'myusername',
      });

      const result = await controller.updateMyProfile({ displayName: 'My Name', username: 'myusername' }, mockUser);
      expect(mockUsersService.updateMyProfile).toHaveBeenCalledWith(
         { displayName: 'My Name', username: 'myusername' },
         mockUser,
      );
      expect(result).toEqual({ id: 'u1', displayName: 'My Name', username: 'myusername' });
   });
});
