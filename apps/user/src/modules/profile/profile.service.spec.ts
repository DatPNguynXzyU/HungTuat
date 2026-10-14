import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ConflictException, NotFoundException, SERVICES } from '@common';
import { ProfileService } from '@user/modules/profile/profile.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { UserResolverService } from '@user/shared/services';
import { OutboxService } from '@user/core/outbox';
import { UsernameBloomFilterService } from '@user/modules/authentication';
import { UserGraphSyncService } from '@user/modules/follow';
import { UserEntity, UserStatus } from '@user/core/database/entities';
import { USER_AGGREGATES, USER_OUTBOX_EVENTS } from '@contracts/user';

describe('ProfileService', () => {
   let service: ProfileService;

   const mockUserProfileRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByUsername: jest.fn(),
      findDateOfBirth: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
   };

   const mockMediaClient = {
      send: jest.fn().mockReturnValue(of({ url: 'https://cdn.example.com/avatar.jpg', key: 'key1' })),
   };

   const mockOutboxService = {
      createOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
   };

   const mockUsernameBloomFilterService = {
      mightContain: jest.fn().mockResolvedValue(false),
      addUsername: jest.fn().mockResolvedValue(undefined),
   };

   const mockUserGraphSyncService = {
      syncUserToGraph: jest.fn().mockResolvedValue(undefined),
   };

   const mockSearchClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ProfileService,
            UserResolverService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: SERVICES.MEDIA_SERVICE,
               useValue: mockMediaClient,
            },
            {
               provide: OutboxService,
               useValue: mockOutboxService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
            {
               provide: UserGraphSyncService,
               useValue: mockUserGraphSyncService,
            },
            {
               provide: SERVICES.SEARCH_SERVICE,
               useValue: mockSearchClient,
            },
         ],
      }).compile();

      service = module.get<ProfileService>(ProfileService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should get user by id', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockUserProfileRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('u1');
      expect(result).toEqual(mockUser);
   });

   it('should get date of birth and calculate age correctly', async () => {
      mockUserProfileRepository.findDateOfBirth.mockResolvedValue({
         userId: 'u1',
         dateOfBirth: new Date('2000-01-01'),
      });

      const result = await service.getDateOfBirth('u1');
      expect(result.userId).toBe('u1');
      expect(result.age).toBeGreaterThan(0);
   });

   describe('updateUserProfile', () => {
      it('should throw NotFoundException if user is not found', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         await expect(service.updateUserProfile('non-existent', { displayName: 'Updated' })).rejects.toThrow(
            NotFoundException,
         );
         expect(mockUserProfileRepository.update).not.toHaveBeenCalled();
      });

      it('should update and return user when user exists', async () => {
         const existingUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'existinguser',
            status: UserStatus.ACTIVE,
         });
         const updatedUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'existinguser',
            status: UserStatus.ACTIVE,
         });

         mockUserProfileRepository.findById.mockResolvedValue(existingUser);
         mockUserProfileRepository.update.mockResolvedValue(updatedUser);

         const result = await service.updateUserProfile('u1', { displayName: 'New Name' });
         expect(result).toEqual(updatedUser);
         expect(mockUserProfileRepository.update).toHaveBeenCalledWith('u1', { displayName: 'New Name' });
         expect(mockOutboxService.createOutboxEvent).toHaveBeenCalled();
         expect(mockSearchClient.emit).toHaveBeenCalled();
      });

      it('should throw ConflictException if new username is already taken', async () => {
         const existingUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            username: 'oldname',
            status: UserStatus.ACTIVE,
         });
         const otherUser = new UserEntity({
            userId: 'u2',
            accountId: 'acc2',
            username: 'takenname',
            status: UserStatus.ACTIVE,
         });

         mockUserProfileRepository.findById.mockResolvedValue(existingUser);
         mockUsernameBloomFilterService.mightContain.mockResolvedValue(true);
         mockUserProfileRepository.findByUsername.mockResolvedValue(otherUser);

         await expect(service.updateUserProfile('u1', { username: 'takenname' })).rejects.toThrow(ConflictException);
         expect(mockUserProfileRepository.update).not.toHaveBeenCalled();
      });
   });

   describe('upsertUserProfile', () => {
      it('should update user if user exists', async () => {
         const existingUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            status: UserStatus.ACTIVE,
         });
         const updatedUser = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            status: UserStatus.ACTIVE,
         });

         mockUserProfileRepository.findById.mockResolvedValue(existingUser);
         mockUserProfileRepository.update.mockResolvedValue(updatedUser);

         const result = await service.upsertUserProfile('u1', { displayName: 'Upsert Name' });
         expect(result).toEqual(updatedUser);
         expect(mockUserProfileRepository.create).not.toHaveBeenCalled();
      });

      it('should create new user profile if user is not found', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         const createdUser = new UserEntity({
            userId: 'new-u1',
            accountId: 'acc-new',
            status: UserStatus.ACTIVE,
         });
         mockUserProfileRepository.create.mockResolvedValue(createdUser);

         const result = await service.upsertUserProfile('acc-new', { displayName: 'Initial Name' });
         expect(result).toEqual(createdUser);
         expect(mockUserProfileRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'acc-new',
               displayName: 'Initial Name',
            }),
         );
      });
   });

   describe('deleteUser', () => {
      it('should soft delete user and publish outbox event using constants', async () => {
         const user = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            status: UserStatus.ACTIVE,
         });
         mockUserProfileRepository.findById.mockResolvedValue(user);
         mockUserProfileRepository.softDelete.mockResolvedValue(user);

         const result = await service.deleteUser('u1');
         expect(result).toEqual(user);
         expect(mockUserProfileRepository.softDelete).toHaveBeenCalledWith('u1');
         expect(mockOutboxService.createOutboxEvent).toHaveBeenCalledWith(
            'u1',
            USER_AGGREGATES.USER,
            USER_OUTBOX_EVENTS.USER_DELETED,
            {
               userId: 'u1',
               accountId: 'acc1',
            },
         );
      });
   });

   describe('restoreUser', () => {
      it('should restore user and publish outbox event using constants', async () => {
         const user = new UserEntity({
            userId: 'u1',
            accountId: 'acc1',
            status: UserStatus.ACTIVE,
         });
         mockUserProfileRepository.restore.mockResolvedValue(user);

         const result = await service.restoreUser('u1');
         expect(result).toEqual(user);
         expect(mockUserProfileRepository.restore).toHaveBeenCalledWith('u1');
         expect(mockOutboxService.createOutboxEvent).toHaveBeenCalledWith(
            'u1',
            USER_AGGREGATES.USER,
            USER_OUTBOX_EVENTS.USER_RESTORED,
            {
               userId: 'u1',
               accountId: 'acc1',
            },
         );
      });
   });
});
