import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@common';
import { ProfileLifecycleService } from '@user/services/domain/profile-lifecycle.service';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { ProfileSyncService } from '@user/services/infrastructure/profile-sync.service';
import { USER_PROFILE_REPOSITORY } from '@user/repositories/user-profile.repository';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { UserEntity, UserStatus } from '@user/entities';

describe('ProfileLifecycleService (Domain)', () => {
   let service: ProfileLifecycleService;

   const mockUserProfileRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findByUsername: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
   };

   const mockProfileQueryService = {
      getUserById: jest.fn(),
   };

   const mockUsernameBloomFilterService = {
      mightContain: jest.fn().mockResolvedValue(false),
   };

   const mockProfileSyncService = {
      syncUserCreated: jest.fn().mockResolvedValue(undefined),
      syncUserUpdated: jest.fn().mockResolvedValue(undefined),
      syncUserDeleted: jest.fn().mockResolvedValue(undefined),
      syncUserRestored: jest.fn().mockResolvedValue(undefined),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ProfileLifecycleService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: ProfileQueryService,
               useValue: mockProfileQueryService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
            {
               provide: ProfileSyncService,
               useValue: mockProfileSyncService,
            },
         ],
      }).compile();

      service = module.get<ProfileLifecycleService>(ProfileLifecycleService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('createUser', () => {
      it('should create and sync user successfully', async () => {
         const user = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'alex',
            status: UserStatus.ACTIVE,
         });
         mockUserProfileRepository.create.mockResolvedValue(user);

         const result = await service.createUser({ accountId: 'acc1', username: 'alex' });
         expect(result).toEqual(user);
         expect(mockUserProfileRepository.create).toHaveBeenCalledWith({ accountId: 'acc1', username: 'alex' });
         expect(mockProfileSyncService.syncUserCreated).toHaveBeenCalledWith(user);
      });

      it('should throw ConflictException if username already taken', async () => {
         mockUsernameBloomFilterService.mightContain.mockResolvedValue(true);
         mockUserProfileRepository.findByUsername.mockResolvedValue(new UserEntity({ userId: 'other' }));

         await expect(service.createUser({ accountId: 'acc1', username: 'taken' })).rejects.toThrow(ConflictException);
         expect(mockUserProfileRepository.create).not.toHaveBeenCalled();
      });
   });

   describe('updateUserProfile', () => {
      it('should update user and call sync', async () => {
         const existingUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'old',
            status: UserStatus.ACTIVE,
         });
         const updatedUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'old',
            displayName: 'Updated Name',
            status: UserStatus.ACTIVE,
         });

         mockProfileQueryService.getUserById.mockResolvedValue(existingUser);
         mockUserProfileRepository.update.mockResolvedValue(updatedUser);

         const result = await service.updateUserProfile('u1', { displayName: 'Updated Name' });
         expect(result).toEqual(updatedUser);
         expect(mockUserProfileRepository.update).toHaveBeenCalledWith('u1', { displayName: 'Updated Name' });
         expect(mockProfileSyncService.syncUserUpdated).toHaveBeenCalledWith(
            updatedUser,
            { displayName: 'Updated Name' },
            existingUser,
         );
      });
   });

   describe('upsertUserProfile', () => {
      it('should update user if user exists', async () => {
         const existingUser = new UserEntity({ userId: 'u1', accountId: 'acc1' });
         mockProfileQueryService.getUserById.mockResolvedValue(existingUser);
         mockUserProfileRepository.update.mockResolvedValue(existingUser);

         const result = await service.upsertUserProfile('u1', { displayName: 'Name' });
         expect(result).toEqual(existingUser);
      });

      it('should fallback to create user when user not found', async () => {
         mockProfileQueryService.getUserById.mockRejectedValue(new NotFoundException('USER_NOT_FOUND'));
         const createdUser = new UserEntity({ userId: 'new-u', accountId: 'acc1' });
         mockUserProfileRepository.create.mockResolvedValue(createdUser);

         const result = await service.upsertUserProfile('acc1', { displayName: 'Initial' });
         expect(result).toEqual(createdUser);
         expect(mockUserProfileRepository.create).toHaveBeenCalledWith({
            accountId: 'acc1',
            displayName: 'Initial',
         });
      });
   });

   describe('updateUsername', () => {
      it('should return existing user without update if username unchanged', async () => {
         const user = new UserEntity({ userId: 'u1', username: 'sameusername' });
         mockProfileQueryService.getUserById.mockResolvedValue(user);

         const result = await service.updateUsername('u1', 'sameusername');
         expect(result).toEqual(user);
         expect(mockUserProfileRepository.update).not.toHaveBeenCalled();
      });

      it('should throw ConflictException if new username belongs to another user', async () => {
         const currentUser = new UserEntity({ userId: 'u1', username: 'olduser' });
         const otherUser = new UserEntity({ userId: 'u2', username: 'newuser' });

         mockProfileQueryService.getUserById.mockResolvedValue(currentUser);
         mockUsernameBloomFilterService.mightContain.mockResolvedValue(true);
         mockUserProfileRepository.findByUsername.mockResolvedValue(otherUser);

         await expect(service.updateUsername('u1', 'newuser')).rejects.toThrow(ConflictException);
         expect(mockUserProfileRepository.update).not.toHaveBeenCalled();
      });
   });

   describe('deleteUser and restoreUser', () => {
      it('should soft delete user and trigger sync', async () => {
         const user = new UserEntity({ userId: 'u1', accountId: 'acc1' });
         mockProfileQueryService.getUserById.mockResolvedValue(user);
         mockUserProfileRepository.softDelete.mockResolvedValue(user);

         const result = await service.deleteUser('u1');
         expect(result).toEqual(user);
         expect(mockProfileSyncService.syncUserDeleted).toHaveBeenCalledWith('u1', 'acc1');
      });

      it('should restore user and trigger sync', async () => {
         const user = new UserEntity({ userId: 'u1', accountId: 'acc1' });
         mockUserProfileRepository.restore.mockResolvedValue(user);

         const result = await service.restoreUser('u1');
         expect(result).toEqual(user);
         expect(mockProfileSyncService.syncUserRestored).toHaveBeenCalledWith(user);
      });
   });
});
