import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { UserController } from '@user/user.controller';
import { UserCoreService } from '@user/services/domain/user-core.service';
import { FollowStatus, UserEntity, UserStatus } from '@user/entities';

describe('UserController', () => {
   let controller: UserController;
   let commandBus: CommandBus;
   let rmqService: RmqService;

   const mockUser: UserEntity = {
      userId: 'user-123',
      accountId: 'acc-123',
      username: 'john_doe',
      displayName: 'John Doe',
      bio: 'Hello world',
      avatar: 'https://example.com/avatar.jpg',
      coverImage: 'https://example.com/cover.jpg',
      website: 'https://example.com',
      location: 'New York, USA',
      status: UserStatus.ACTIVE,
      isPrivate: false,
      isVerified: false,
      followersCount: 10,
      followingCount: 5,
      postsCount: 0,
      recipesCount: 0,
      lastActiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      profile: null,
      stats: null,
      settings: null,
   };

   const mockCommandBus = {
      execute: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   const mockUserCoreService = {
      getUserById: jest.fn(),
      getUserByAccountId: jest.fn(),
      getUserByUserId: jest.fn(),
      getUserByUsername: jest.fn(),
      getDateOfBirth: jest.fn(),
      calculateAge: jest.fn(),
      createUser: jest.fn(),
      updateUserProfile: jest.fn(),
      upsertUserProfile: jest.fn(),
      updateUsername: jest.fn(),
      deleteUser: jest.fn(),
      restoreUser: jest.fn(),
      uploadAvatar: jest.fn(),
      getAvatarUploadSignature: jest.fn(),
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
      searchUsers: jest.fn(),
      checkUsername: jest.fn(),
      handleUserRegistered: jest.fn(),
      getUserStats: jest.fn(),
      rebuildProjections: jest.fn(),
   };

   const mockRmqContext = {
      getChannelRef: jest.fn(),
      getMessage: jest.fn(),
   } as unknown as RmqContext;

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserController],
         providers: [
            {
               provide: CommandBus,
               useValue: mockCommandBus,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
            {
               provide: UserCoreService,
               useValue: mockUserCoreService,
            },
         ],
      }).compile();

      controller = module.get<UserController>(UserController);
      commandBus = module.get<CommandBus>(CommandBus);
      rmqService = module.get<RmqService>(RmqService);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(commandBus).toBeDefined();
      expect(rmqService).toBeDefined();
   });

   describe('Authentication & Registration endpoints', () => {
      it('should handle handleUserRegistered and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const payload = { accountId: 'acc-123', email: 'test@example.com' };

         const result = await controller.handleUserRegistered(payload, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle checkUsername and ack message', async () => {
         const checkResult = { available: true, username: 'testuser' };
         mockCommandBus.execute.mockResolvedValue(checkResult);

         const result = await controller.checkUsername({ username: 'testuser' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(checkResult);
      });
   });

   describe('Profile Query endpoints', () => {
      it('should handle getUserById and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123' } };

         const result = await controller.getUserById(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle getUserByUserId and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);

         const result = await controller.getUserByUserId({ userId: 'user-123' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle getUserByAccountId and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);

         const result = await controller.getUserByAccountId({ accountId: 'acc-123' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle getUserByUsername and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);

         const result = await controller.getUserByUsername({ username: 'john_doe' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle getDateOfBirth and ack message', async () => {
         const dobDto = { userId: 'user-123', dateOfBirth: '1990-01-01', age: 34 };
         mockCommandBus.execute.mockResolvedValue(dobDto);

         const result = await controller.getDateOfBirth({ userId: 'user-123' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(dobDto);
      });
   });

   describe('Profile Lifecycle endpoints', () => {
      it('should handle createProfile and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { accountId: 'acc-123', username: 'johndoe' } };

         const result = await controller.createProfile(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle createUser and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const data = { accountId: 'acc-123', username: 'johndoe' };

         const result = await controller.createUser(data, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle updateUserProfile and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123', bio: 'Updated bio' } };

         const result = await controller.updateUserProfile(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle upsertUserProfile and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123', bio: 'Upsert bio' } };

         const result = await controller.upsertUserProfile(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle updateUsername and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123', username: 'newname' } };

         const result = await controller.updateUsername(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle deleteUser and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123' } };

         const result = await controller.deleteUser(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle restoreUser and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);

         const result = await controller.restoreUser({ userId: 'user-123' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });
   });

   describe('Avatar endpoints', () => {
      it('should handle uploadAvatar and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const message = { data: { userId: 'user-123', fileBase64: 'base64', mimeType: 'image/png' } };

         const result = await controller.uploadAvatar(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should handle getAvatarUploadSignature and ack message', async () => {
         const sig = { uploadUrl: 'https://s3.amazonaws.com/signature' };
         mockCommandBus.execute.mockResolvedValue(sig);
         const message = { data: { userId: 'user-123' } };

         const result = await controller.getAvatarUploadSignature(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(sig);
      });
   });

   describe('Social Graph endpoints', () => {
      const mockFollow = {
         followId: 'f-1',
         followerId: 'user-1',
         followingId: 'user-2',
         status: FollowStatus.ACCEPTED,
         createdAt: new Date(),
         updatedAt: new Date(),
      };

      it('should handle followUser and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockFollow);
         const message = { data: { followerId: 'user-1', followingId: 'user-2' } };

         const result = await controller.followUser(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockFollow);
      });

      it('should handle unfollowUser and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue({ success: true });
         const message = { data: { followerId: 'user-1', followingId: 'user-2' } };

         const result = await controller.unfollowUser(message, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual({ success: true });
      });

      it('should handle acceptFollowRequest and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(mockFollow);

         const result = await controller.acceptFollowRequest({ followId: 'f-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockFollow);
      });

      it('should handle rejectFollowRequest and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue(undefined);

         const result = await controller.rejectFollowRequest({ followId: 'f-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBeUndefined();
      });

      it('should handle getFollowers and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue([mockFollow]);

         const result = await controller.getFollowers({ userId: 'user-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual([mockFollow]);
      });

      it('should handle getFollowing and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue([mockFollow]);

         const result = await controller.getFollowing({ userId: 'user-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual([mockFollow]);
      });

      it('should handle getFollowersCount and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue({ count: 10 });

         const result = await controller.getFollowersCount({ userId: 'user-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual({ count: 10 });
      });

      it('should handle getFollowingCount and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue({ count: 5 });

         const result = await controller.getFollowingCount({ userId: 'user-1' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual({ count: 5 });
      });

      it('should handle getMutualFollowers and ack message', async () => {
         mockCommandBus.execute.mockResolvedValue([mockUser]);

         const result = await controller.getMutualFollowers({ userId1: 'user-1', userId2: 'user-2' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toEqual([mockUser]);
      });

      it('should handle getFollowSuggestions and ack message', async () => {
         const suggestions = [{ userId: 'u3', username: 'suggested' }];
         mockCommandBus.execute.mockResolvedValue(suggestions);

         const result = await controller.getFollowSuggestions({ userId: 'user-1', limit: 10 }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(suggestions);
      });
   });

   describe('Search endpoints', () => {
      it('should handle searchUsers and ack message', async () => {
         const searchResult = { items: [], nextCursor: null, hasMore: false };
         mockCommandBus.execute.mockResolvedValue(searchResult);

         const result = await controller.searchUsers({ query: 'john' }, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(searchResult);
      });
   });

   describe('CQRS Projections & Rebuild', () => {
      it('should handle getUserStats and ack message', async () => {
         const stats = { userId: 'u1', followersCount: 10, followingCount: 5 };
         mockUserCoreService.getUserStats.mockResolvedValue(stats);

         const result = await controller.getUserStats({ userId: 'u1' }, mockRmqContext);

         expect(mockUserCoreService.getUserStats).toHaveBeenCalledWith('u1');
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(stats);
      });

      it('should handle rebuildProjections and ack message', async () => {
         const rebuildResult = { replayedCount: 100, durationMs: 250 };
         mockUserCoreService.rebuildProjections.mockResolvedValue(rebuildResult);

         const result = await controller.rebuildProjections({ options: { batchSize: 50 } }, mockRmqContext);

         expect(mockUserCoreService.rebuildProjections).toHaveBeenCalledWith({ batchSize: 50 });
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(rebuildResult);
      });
   });

   describe('Error handling', () => {
      it('should ack message and rethrow error when execute throws', async () => {
         const error = new Error('Execution failure');
         mockCommandBus.execute.mockRejectedValue(error);

         await expect(controller.getUserById({ data: { userId: 'invalid' } }, mockRmqContext)).rejects.toThrow(error);

         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
      });
   });
});
