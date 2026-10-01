import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, RmqService, UnauthorizedException } from '@common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
   let controller: UserController;
   const mockUserService = {
      checkUsername: jest.fn(),
      createUser: jest.fn(),
      handleUserRegistered: jest.fn(),
      getUserById: jest.fn(),
      getUserByUserId: jest.fn(),
      getUserByUsername: jest.fn(),
      updateUserProfile: jest.fn(),
      updateUsername: jest.fn(),
      deleteUser: jest.fn(),
      restoreUser: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      acceptFollowRequest: jest.fn(),
      rejectFollowRequest: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFollowersCount: jest.fn(),
      getFollowingCount: jest.fn(),
      getMutualFollowers: jest.fn(),
      getFollowSuggestions: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserController],
         providers: [
            {
               provide: UserService,
               useValue: mockUserService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      controller = module.get<UserController>(UserController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   describe('checkUsername', () => {
      it('should handle checkUsername message pattern', async () => {
         mockUserService.checkUsername.mockResolvedValue({ available: true, username: 'valid_user' });

         const result = await controller.checkUsername({ username: 'valid_user' });

         expect(mockUserService.checkUsername).toHaveBeenCalledWith('valid_user');
         expect(result).toEqual({ available: true, username: 'valid_user' });
      });
   });

   describe('createProfile', () => {
      it('should handle createProfile message pattern from gateway', async () => {
         const mockResult = { id: 'u1', userId: 'user-auth-1', displayName: 'John Doe' };
         mockUserService.createUser.mockResolvedValue(mockResult);

         const result = await controller.createProfile({
            data: { displayName: 'John Doe', username: 'johndoe' },
            user: {
               userId: 'user-auth-1',
               email: 'john@example.com',
               roles: ['user'],
               permissions: [],
            },
         });

         expect(mockUserService.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
               userId: 'user-auth-1',
               displayName: 'John Doe',
               username: 'johndoe',
            }),
         );
         expect(result).toEqual(mockResult);
      });
   });

   describe('handleUserRegistered', () => {
      it('should handle user registered event from auth service', async () => {
         mockUserService.handleUserRegistered.mockResolvedValue({ id: 'user-1', userId: 'auth-user-1' });

         const result = await controller.handleUserRegistered({ userId: 'auth-user-1', email: 'test@example.com' });
         expect(mockUserService.handleUserRegistered).toHaveBeenCalledWith({
            userId: 'auth-user-1',
            email: 'test@example.com',
         });
         expect(result).toEqual({ id: 'user-1', userId: 'auth-user-1' });
      });
   });

   describe('getUserById', () => {
      it('should return user for public request', async () => {
         const mockUser = { id: 'user-db-1', userId: 'user-auth-1', username: 'john' };
         mockUserService.getUserById.mockResolvedValue(mockUser);

         const result = await controller.getUserById({ data: { id: 'user-db-1' } });
         expect(mockUserService.getUserById).toHaveBeenCalledWith('user-db-1');
         expect(result).toEqual(mockUser);
      });
   });

   describe('updateUserProfile', () => {
      it('should allow user to update their own profile', async () => {
         const mockUser = { id: 'user-db-1', userId: 'user-auth-1' };
         mockUserService.getUserById.mockResolvedValue(mockUser);
         mockUserService.updateUserProfile.mockResolvedValue({ ...mockUser, displayName: 'John Doe' });

         const result = await controller.updateUserProfile({
            data: { id: 'user-db-1', displayName: 'John Doe' },
            user: {
               userId: 'user-auth-1',
               email: 'john@example.com',
               roles: ['user'],
               permissions: [],
            },
         });

         expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user-db-1', { displayName: 'John Doe' });
         expect(result).toEqual({ ...mockUser, displayName: 'John Doe' });
      });

      it('should allow admin to update any user profile', async () => {
         const mockUser = { id: 'user-db-1', userId: 'user-auth-1' };
         mockUserService.getUserById.mockResolvedValue(mockUser);
         mockUserService.updateUserProfile.mockResolvedValue({ ...mockUser, displayName: 'Admin Edited' });

         const result = await controller.updateUserProfile({
            data: { id: 'user-db-1', displayName: 'Admin Edited' },
            user: {
               userId: 'admin-auth-id',
               email: 'admin@example.com',
               roles: ['admin'],
               permissions: [],
            },
         });

         expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('user-db-1', { displayName: 'Admin Edited' });
         expect(result).toEqual({ ...mockUser, displayName: 'Admin Edited' });
      });

      it('should reject non-owner and non-admin from updating user profile', async () => {
         const mockUser = { id: 'user-db-1', userId: 'user-auth-1' };
         mockUserService.getUserById.mockResolvedValue(mockUser);

         await expect(
            controller.updateUserProfile({
               data: { id: 'user-db-1', displayName: 'Hacker Name' },
               user: {
                  userId: 'other-user-auth-id',
                  email: 'other@example.com',
                  roles: ['user'],
                  permissions: [],
               },
            }),
         ).rejects.toThrow(ForbiddenException);
      });

      it('should reject update if user context is missing', async () => {
         const mockUser = { id: 'user-db-1', userId: 'user-auth-1' };
         mockUserService.getUserById.mockResolvedValue(mockUser);

         await expect(
            controller.updateUserProfile({
               data: { id: 'user-db-1', displayName: 'No Context' },
            }),
         ).rejects.toThrow(UnauthorizedException);
      });
   });

   describe('followUser', () => {
      it('should allow user to follow as themselves', async () => {
         mockUserService.followUser.mockResolvedValue({ id: 'follow-1', followerId: 'user-1', followingId: 'user-2' });

         const result = await controller.followUser({
            data: { followerId: 'user-1', followingId: 'user-2' },
            user: {
               userId: 'user-1',
               email: 'u1@example.com',
               roles: ['user'],
               permissions: [],
            },
         });

         expect(mockUserService.followUser).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual({ id: 'follow-1', followerId: 'user-1', followingId: 'user-2' });
      });

      it('should reject when user tries to make someone else follow', async () => {
         await expect(
            controller.followUser({
               data: { followerId: 'user-victim', followingId: 'user-target' },
               user: {
                  userId: 'user-attacker',
                  email: 'attacker@example.com',
                  roles: ['user'],
                  permissions: [],
               },
            }),
         ).rejects.toThrow(ForbiddenException);
      });
   });
});
