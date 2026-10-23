import { Test, TestingModule } from '@nestjs/testing';
import { UserCoreService } from '@user/services/domain/user-core.service';
import { ProfileService } from '@user/services/domain/profile.service';
import { FollowService } from '@user/services/domain/follow.service';
import { UserSearchService } from '@user/services/domain/user-search.service';
import { AuthService } from '@user/services/domain/auth.service';
import { FollowStatus, UserEntity, UserStatus } from '@user/entities';

describe('UserCoreService (Facade)', () => {
   let service: UserCoreService;

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
      lastUsernameChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      profile: null,
      stats: null,
      settings: null,
   };

   const mockProfileService = {
      getUserById: jest.fn(),
      getUserByAccountId: jest.fn(),
      getUserByUserId: jest.fn(),
      getUserByUsername: jest.fn(),
      calculateAge: jest.fn(),
      getDateOfBirth: jest.fn(),
      createUser: jest.fn(),
      updateUserProfile: jest.fn(),
      upsertUserProfile: jest.fn(),
      updateUsername: jest.fn(),
      deleteUser: jest.fn(),
      restoreUser: jest.fn(),
      uploadAvatar: jest.fn(),
      getAvatarUploadSignature: jest.fn(),
   };

   const mockFollowService = {
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

   const mockUserSearchService = {
      searchUsers: jest.fn(),
   };

   const mockAuthService = {
      checkUsername: jest.fn(),
      handleUserRegistered: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserCoreService,
            {
               provide: ProfileService,
               useValue: mockProfileService,
            },
            {
               provide: FollowService,
               useValue: mockFollowService,
            },
            {
               provide: UserSearchService,
               useValue: mockUserSearchService,
            },
            {
               provide: AuthService,
               useValue: mockAuthService,
            },
         ],
      }).compile();

      service = module.get<UserCoreService>(UserCoreService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('Profile Queries delegation', () => {
      it('should delegate getUserById to profileService', async () => {
         mockProfileService.getUserById.mockResolvedValue(mockUser);
         const result = await service.getUserById('user-123');
         expect(mockProfileService.getUserById).toHaveBeenCalledWith('user-123');
         expect(result).toBe(mockUser);
      });

      it('should delegate getUserByAccountId to profileService', async () => {
         mockProfileService.getUserByAccountId.mockResolvedValue(mockUser);
         const result = await service.getUserByAccountId('acc-123');
         expect(mockProfileService.getUserByAccountId).toHaveBeenCalledWith('acc-123');
         expect(result).toBe(mockUser);
      });

      it('should delegate getUserByUserId to profileService', async () => {
         mockProfileService.getUserByUserId.mockResolvedValue(mockUser);
         const result = await service.getUserByUserId('user-123');
         expect(mockProfileService.getUserByUserId).toHaveBeenCalledWith('user-123');
         expect(result).toBe(mockUser);
      });

      it('should delegate getUserByUsername to profileService', async () => {
         mockProfileService.getUserByUsername.mockResolvedValue(mockUser);
         const result = await service.getUserByUsername('john_doe');
         expect(mockProfileService.getUserByUsername).toHaveBeenCalledWith('john_doe');
         expect(result).toBe(mockUser);
      });

      it('should delegate calculateAge to profileService', () => {
         mockProfileService.calculateAge.mockReturnValue(34);
         const age = service.calculateAge(new Date('1990-01-01'));
         expect(mockProfileService.calculateAge).toHaveBeenCalled();
         expect(age).toBe(34);
      });

      it('should delegate getDateOfBirth to profileService', async () => {
         const dobDto = { userId: 'user-123', dateOfBirth: '1990-01-01', age: 34 };
         mockProfileService.getDateOfBirth.mockResolvedValue(dobDto);
         const result = await service.getDateOfBirth('user-123');
         expect(mockProfileService.getDateOfBirth).toHaveBeenCalledWith('user-123');
         expect(result).toBe(dobDto);
      });
   });

   describe('Profile Lifecycle delegation', () => {
      it('should delegate createUser to profileService', async () => {
         const createDto = { accountId: 'acc-123', username: 'john_doe' };
         mockProfileService.createUser.mockResolvedValue(mockUser);
         const result = await service.createUser(createDto);
         expect(mockProfileService.createUser).toHaveBeenCalledWith(createDto);
         expect(result).toBe(mockUser);
      });

      it('should delegate updateUserProfile to profileService', async () => {
         const updateDto = { bio: 'Updated bio' };
         mockProfileService.updateUserProfile.mockResolvedValue(mockUser);
         const result = await service.updateUserProfile('user-123', updateDto);
         expect(mockProfileService.updateUserProfile).toHaveBeenCalledWith('user-123', updateDto);
         expect(result).toBe(mockUser);
      });

      it('should delegate upsertUserProfile to profileService', async () => {
         const upsertDto = { bio: 'Upsert bio' };
         mockProfileService.upsertUserProfile.mockResolvedValue(mockUser);
         const result = await service.upsertUserProfile('user-123', upsertDto);
         expect(mockProfileService.upsertUserProfile).toHaveBeenCalledWith('user-123', upsertDto);
         expect(result).toBe(mockUser);
      });

      it('should delegate updateUsername to profileService', async () => {
         mockProfileService.updateUsername.mockResolvedValue(mockUser);
         const result = await service.updateUsername('user-123', 'new_name');
         expect(mockProfileService.updateUsername).toHaveBeenCalledWith('user-123', 'new_name');
         expect(result).toBe(mockUser);
      });

      it('should delegate deleteUser to profileService', async () => {
         mockProfileService.deleteUser.mockResolvedValue(mockUser);
         const result = await service.deleteUser('user-123');
         expect(mockProfileService.deleteUser).toHaveBeenCalledWith('user-123');
         expect(result).toBe(mockUser);
      });

      it('should delegate restoreUser to profileService', async () => {
         mockProfileService.restoreUser.mockResolvedValue(mockUser);
         const result = await service.restoreUser('user-123');
         expect(mockProfileService.restoreUser).toHaveBeenCalledWith('user-123');
         expect(result).toBe(mockUser);
      });
   });

   describe('Avatar operations delegation', () => {
      it('should delegate uploadAvatar to profileService', async () => {
         const avatarResult = { avatarUrl: 'https://example.com/avatar.jpg', publicId: 'pub-1', user: mockUser };
         mockProfileService.uploadAvatar.mockResolvedValue(avatarResult);
         const result = await service.uploadAvatar('user-123', 'base64data', 'image/png');
         expect(mockProfileService.uploadAvatar).toHaveBeenCalledWith('user-123', 'base64data', 'image/png');
         expect(result).toBe(avatarResult);
      });

      it('should delegate getAvatarUploadSignature to profileService', async () => {
         const sig = { uploadUrl: 'https://s3.amazonaws.com/sign' };
         mockProfileService.getAvatarUploadSignature.mockResolvedValue(sig);
         const result = await service.getAvatarUploadSignature('user-123');
         expect(mockProfileService.getAvatarUploadSignature).toHaveBeenCalledWith('user-123');
         expect(result).toBe(sig);
      });
   });

   describe('Follow operations delegation', () => {
      const mockFollow = {
         followId: 'f-1',
         followerId: 'user-1',
         followingId: 'user-2',
         status: FollowStatus.ACCEPTED,
         createdAt: new Date(),
         updatedAt: new Date(),
      };

      it('should delegate followUser to followService', async () => {
         mockFollowService.followUser.mockResolvedValue(mockFollow);
         const result = await service.followUser('user-1', 'user-2', { strict: true });
         expect(mockFollowService.followUser).toHaveBeenCalledWith('user-1', 'user-2', { strict: true });
         expect(result).toBe(mockFollow);
      });

      it('should delegate unfollowUser to followService', async () => {
         mockFollowService.unfollowUser.mockResolvedValue(undefined);
         await service.unfollowUser('user-1', 'user-2');
         expect(mockFollowService.unfollowUser).toHaveBeenCalledWith('user-1', 'user-2', undefined);
      });

      it('should delegate acceptFollowRequest to followService', async () => {
         mockFollowService.acceptFollowRequest.mockResolvedValue(mockFollow);
         const result = await service.acceptFollowRequest('f-1');
         expect(mockFollowService.acceptFollowRequest).toHaveBeenCalledWith('f-1');
         expect(result).toBe(mockFollow);
      });

      it('should delegate rejectFollowRequest to followService', async () => {
         mockFollowService.rejectFollowRequest.mockResolvedValue(mockFollow);
         const result = await service.rejectFollowRequest('f-1');
         expect(mockFollowService.rejectFollowRequest).toHaveBeenCalledWith('f-1', undefined);
         expect(result).toBe(mockFollow);
      });

      it('should delegate getFollowers to followService', async () => {
         mockFollowService.getFollowers.mockResolvedValue([mockFollow]);
         const result = await service.getFollowers('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(mockFollowService.getFollowers).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(result).toEqual([mockFollow]);
      });

      it('should delegate getFollowing to followService', async () => {
         mockFollowService.getFollowing.mockResolvedValue([mockFollow]);
         const result = await service.getFollowing('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(mockFollowService.getFollowing).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(result).toEqual([mockFollow]);
      });

      it('should delegate getFollowersCount to followService', async () => {
         mockFollowService.getFollowersCount.mockResolvedValue(42);
         const count = await service.getFollowersCount('user-1', FollowStatus.ACCEPTED);
         expect(mockFollowService.getFollowersCount).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED);
         expect(count).toBe(42);
      });

      it('should delegate getFollowingCount to followService', async () => {
         mockFollowService.getFollowingCount.mockResolvedValue(21);
         const count = await service.getFollowingCount('user-1', FollowStatus.ACCEPTED);
         expect(mockFollowService.getFollowingCount).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED);
         expect(count).toBe(21);
      });

      it('should delegate getMutualFollowers to followService', async () => {
         const mutualIds = ['user-2', 'user-3'];
         mockFollowService.getMutualFollowers.mockResolvedValue(mutualIds);
         const result = await service.getMutualFollowers('user-1', 'user-2');
         expect(mockFollowService.getMutualFollowers).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual(mutualIds);
      });

      it('should delegate getFollowSuggestions to followService', async () => {
         const suggestions = [{ userId: 'u3', username: 'suggested' }];
         mockFollowService.getFollowSuggestions.mockResolvedValue(suggestions);
         const result = await service.getFollowSuggestions('user-1', 5);
         expect(mockFollowService.getFollowSuggestions).toHaveBeenCalledWith('user-1', 5);
         expect(result).toBe(suggestions);
      });
   });

   describe('Search operations delegation', () => {
      it('should delegate searchUsers to userSearchService', async () => {
         const searchResult = { items: [], nextCursor: null, hasMore: false };
         mockUserSearchService.searchUsers.mockResolvedValue(searchResult);
         const result = await service.searchUsers('john', 10, 'cursor-1', 'current-user');
         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('john', 10, 'cursor-1', 'current-user');
         expect(result).toBe(searchResult);
      });
   });

   describe('Auth / Registration delegation', () => {
      it('should delegate checkUsername to authService', async () => {
         const checkRes = { available: true, username: 'john_doe' };
         mockAuthService.checkUsername.mockResolvedValue(checkRes);
         const result = await service.checkUsername('john_doe');
         expect(mockAuthService.checkUsername).toHaveBeenCalledWith('john_doe');
         expect(result).toBe(checkRes);
      });

      it('should delegate handleUserRegistered to authService', async () => {
         const regData = { accountId: 'acc-1', email: 'john@example.com' };
         mockAuthService.handleUserRegistered.mockResolvedValue(mockUser);
         const result = await service.handleUserRegistered(regData);
         expect(mockAuthService.handleUserRegistered).toHaveBeenCalledWith(regData);
         expect(result).toBe(mockUser);
      });
   });

   describe('CQRS Projections & Rebuild delegation', () => {
      it('should return null when projections are not configured', async () => {
         expect(await service.getUserStats('u1')).toBeNull();
         expect(await service.getUserProfileProjection('u1')).toBeNull();
         expect(await service.getUserActivitySummary('u1')).toBeNull();
         await expect(service.rebuildProjections()).rejects.toThrow();
      });

      it('should delegate to projections and rebuild service when provided', async () => {
         const mockUserStats = { getUserStats: jest.fn().mockResolvedValue({ followersCount: 5 }) };
         const mockProfileProj = { getProfile: jest.fn().mockResolvedValue({ username: 'john' }) };
         const mockActivityProj = { getActivitySummary: jest.fn().mockResolvedValue({ totalEvents: 10 }) };
         const mockRebuild = { rebuildAll: jest.fn().mockResolvedValue({ replayedCount: 10, durationMs: 50 }) };

         const serviceWithCqrs = new UserCoreService(
            mockProfileService as never,
            mockFollowService as never,
            mockUserSearchService as never,
            mockAuthService as never,
            mockUserStats as never,
            mockProfileProj as never,
            mockActivityProj as never,
            mockRebuild as never,
         );

         expect(await serviceWithCqrs.getUserStats('u1')).toEqual({ followersCount: 5 });
         expect(mockUserStats.getUserStats).toHaveBeenCalledWith('u1');

         expect(await serviceWithCqrs.getUserProfileProjection('u1')).toEqual({ username: 'john' });
         expect(mockProfileProj.getProfile).toHaveBeenCalledWith('u1');

         expect(await serviceWithCqrs.getUserActivitySummary('u1')).toEqual({ totalEvents: 10 });
         expect(mockActivityProj.getActivitySummary).toHaveBeenCalledWith('u1');

         expect(await serviceWithCqrs.rebuildProjections({ batchSize: 50 })).toEqual({
            replayedCount: 10,
            durationMs: 50,
         });
         expect(mockRebuild.rebuildAll).toHaveBeenCalledWith({ batchSize: 50 });
      });
   });
});
